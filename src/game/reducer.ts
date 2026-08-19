/**
 * Machine à états de la partie. Voir CLAUDE.md §7.1 et §7.2.
 *
 * Module volontairement pur : aucune référence à React, au DOM, à `Date.now()` ni à
 * `Math.random()`. La source d'aléa est passée dans les actions. C'est ce qui rend
 * l'ensemble testable sans monter d'interface.
 */
import { ROUNDS_PER_GAME, roundsForPool } from "./config";
import { createDeck, draw, type Deck, type Rng } from "./deck";
import { hasMoreHints, MAX_HINTS, maxHintsFor } from "./hints";
import { ministersForLevel, type LevelId } from "./levels";
import { isNameCorrect, isPortfolioCorrect } from "./matching";
import { continuesStreak, scoreRound, streakBonus, type RoundOutcome } from "./scoring";
import type { Minister } from "./types";

export type RoundStatus =
  "asking" | "nameFound" | "portfolioFound" | "solved" | "revealed";

export interface Round {
  minister: Minister;
  index: number; // 0-based
  nameFound: boolean;
  portfolioFound: boolean;
  hintsUsed: number;
  /** Renseigné une fois la manche terminée, pour l'affichage et le récapitulatif. */
  points: number | null;
  /** Dernière saisie jugée fausse, pour le retour visuel. Remis à null à la frappe. */
  lastRejected: { field: AnswerField; value: string } | null;
}

export type AnswerField = "name" | "portfolio";

export interface GameState {
  status: "idle" | "playing" | "finished";
  /** Base complète, tous niveaux confondus. */
  ministers: readonly Minister[];
  /** Niveau choisi pour la partie en cours. */
  level: LevelId | null;
  /** Personnes jouables au niveau choisi. Le sac est tiré là-dedans. */
  pool: readonly Minister[];
  /** Nombre de manches, plafonné par la taille du vivier. */
  roundsInGame: number;
  deck: Deck<Minister> | null;
  round: Round | null;
  /** Manches terminées, dans l'ordre. */
  history: Round[];
  score: number;
  /** Manches parfaites consécutives, pour le bonus de série. */
  streak: number;
}

export type GameAction =
  | { type: "start"; level: LevelId; rng: Rng }
  /** Retour au choix du niveau, sans conserver la partie précédente. */
  | { type: "reset" }
  | { type: "submit"; field: AnswerField; value: string }
  | { type: "requestHint" }
  | { type: "reveal" }
  | { type: "nextRound"; rng: Rng }
  | { type: "dismissRejection" }
  /** La photo est introuvable sur Commons : on saute la personne (CLAUDE.md §6.3). */
  | { type: "skipUnavailablePhoto"; rng: Rng };

export function initialState(ministers: readonly Minister[]): GameState {
  return {
    status: "idle",
    ministers,
    level: null,
    pool: [],
    roundsInGame: ROUNDS_PER_GAME,
    deck: null,
    round: null,
    history: [],
    score: 0,
    streak: 0,
  };
}

export function roundStatus(round: Round): RoundStatus {
  if (round.points !== null && !(round.nameFound && round.portfolioFound)) {
    return "revealed";
  }
  if (round.nameFound && round.portfolioFound) return "solved";
  if (round.nameFound) return "nameFound";
  if (round.portfolioFound) return "portfolioFound";
  return "asking";
}

export function isRoundOver(round: Round): boolean {
  return round.points !== null;
}

function newRound(minister: Minister, index: number): Round {
  return {
    minister,
    index,
    nameFound: false,
    portfolioFound: false,
    hintsUsed: 0,
    points: null,
    lastRejected: null,
  };
}

function outcomeOf(round: Round): RoundOutcome {
  return {
    nameFound: round.nameFound,
    portfolioFound: round.portfolioFound,
    hintsUsed: round.hintsUsed,
  };
}

/** Clôt la manche courante : calcule les points, met à jour série et historique. */
function closeRound(state: GameState, round: Round): GameState {
  const outcome = outcomeOf(round);
  const streak = continuesStreak(outcome) ? state.streak + 1 : 0;
  const points = scoreRound(outcome) + streakBonus(streak);
  const closed: Round = { ...round, points };

  return {
    ...state,
    round: closed,
    history: [...state.history, closed],
    score: state.score + points,
    streak,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "start": {
      const pool = ministersForLevel(state.ministers, action.level);
      if (pool.length === 0) return state;
      const deck = createDeck(pool, action.rng);
      const { card, deck: nextDeck } = draw(deck, pool, action.rng);
      return {
        ...initialState(state.ministers),
        status: "playing",
        level: action.level,
        pool,
        roundsInGame: roundsForPool(pool.length),
        deck: nextDeck,
        round: newRound(card, 0),
      };
    }

    case "reset":
      return initialState(state.ministers);

    case "submit": {
      const round = state.round;
      if (!round || isRoundOver(round)) return state;

      const alreadyFound =
        action.field === "name" ? round.nameFound : round.portfolioFound;
      if (alreadyFound) return state;

      const correct =
        action.field === "name"
          ? isNameCorrect(action.value, round.minister)
          : isPortfolioCorrect(action.value, round.minister);

      if (!correct) {
        return {
          ...state,
          round: { ...round, lastRejected: { field: action.field, value: action.value } },
        };
      }

      const updated: Round = {
        ...round,
        nameFound: round.nameFound || action.field === "name",
        portfolioFound: round.portfolioFound || action.field === "portfolio",
        lastRejected: null,
      };

      // Les deux champs trouvés : la manche se clôt d'elle-même.
      return updated.nameFound && updated.portfolioFound
        ? closeRound(state, updated)
        : { ...state, round: updated };
    }

    case "requestHint": {
      const round = state.round;
      if (!round || isRoundOver(round)) return state;
      // Le nombre d'indices dépend de la fiche : sans parti connu, deux des six
      // indices n'ont rien à dire et ne sont pas proposés.
      if (!hasMoreHints(round.minister, round.hintsUsed)) return state;
      return { ...state, round: { ...round, hintsUsed: round.hintsUsed + 1 } };
    }

    case "reveal": {
      const round = state.round;
      if (!round || isRoundOver(round)) return state;
      return closeRound(state, round);
    }

    case "dismissRejection": {
      const round = state.round;
      if (!round || round.lastRejected === null) return state;
      return { ...state, round: { ...round, lastRejected: null } };
    }

    case "nextRound": {
      const round = state.round;
      if (!round || !isRoundOver(round) || !state.deck) return state;

      const nextIndex = round.index + 1;
      if (nextIndex >= state.roundsInGame) {
        return { ...state, status: "finished", round: null };
      }
      const { card, deck } = draw(state.deck, state.pool, action.rng);
      return { ...state, deck, round: newRound(card, nextIndex) };
    }

    case "skipUnavailablePhoto": {
      const round = state.round;
      // Une manche déjà entamée (indice pris, réponse trouvée) n'est pas remplacée :
      // seule une photo en échec dès l'affichage justifie de changer de personne.
      if (!round || isRoundOver(round) || !state.deck) return state;
      const { card, deck } = draw(state.deck, state.pool, action.rng);
      return { ...state, deck, round: newRound(card, round.index) };
    }

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export { MAX_HINTS, maxHintsFor, ROUNDS_PER_GAME };
