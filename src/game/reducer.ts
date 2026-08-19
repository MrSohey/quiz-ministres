/**
 * Machine à états de la partie. Voir CLAUDE.md §7.1 et §7.2.
 *
 * Module volontairement pur : aucune référence à React, au DOM, à `Date.now()` ni à
 * `Math.random()`. C'est ce qui rend l'ensemble testable sans monter d'interface.
 *
 * L'aléa est concentré dans la seule action `start`, qui reçoit une graine et en
 * déduit l'ordre de passage complet. Aucune autre action ne tire au sort : c'est ce
 * qui rend une partie reproductible à l'identique depuis un lien partagé (§7.7), et
 * ce qui met le réducteur à l'abri de la double invocation de React StrictMode.
 */
import { ROUNDS_PER_GAME, roundsForPool } from "./config";
import { createLineup } from "./deck";
import { hasMoreHints, MAX_HINTS, maxHintsFor } from "./hints";
import { ministersForLevel, type LevelId } from "./levels";
import { isNameCorrect, isPortfolioCorrect } from "./matching";
import { continuesStreak, scoreRound, streakBonus, type RoundOutcome } from "./scoring";
import { createSeededRng } from "./seed";
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
  /** Graine de la partie : ce qui rend le défi partageable. */
  seed: string | null;
  /** Personnes jouables au niveau choisi. */
  pool: readonly Minister[];
  /** Nombre de manches, plafonné par la taille du vivier. */
  roundsInGame: number;
  /** Vivier mélangé une fois pour toutes, au démarrage. */
  lineup: readonly Minister[];
  /** Position de la prochaine fiche non encore servie dans `lineup`. */
  cursor: number;
  round: Round | null;
  /** Manches terminées, dans l'ordre. */
  history: Round[];
  score: number;
  /** Manches parfaites consécutives, pour le bonus de série. */
  streak: number;
}

export type GameAction =
  | { type: "start"; level: LevelId; seed: string }
  /** Retour au choix du niveau, sans conserver la partie précédente. */
  | { type: "reset" }
  | { type: "submit"; field: AnswerField; value: string }
  | { type: "requestHint" }
  | { type: "reveal" }
  | { type: "nextRound" }
  | { type: "dismissRejection" }
  /** La photo est introuvable sur Commons : on saute la personne (CLAUDE.md §6.3). */
  | { type: "skipUnavailablePhoto" };

export function initialState(ministers: readonly Minister[]): GameState {
  return {
    status: "idle",
    ministers,
    level: null,
    seed: null,
    pool: [],
    roundsInGame: ROUNDS_PER_GAME,
    lineup: [],
    cursor: 0,
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

      // Unique point d'entrée de l'aléa : à graine égale, partie identique.
      const lineup = createLineup(
        pool,
        createSeededRng(`${action.level}:${action.seed}`),
      );
      const first = lineup[0] as Minister;

      return {
        ...initialState(state.ministers),
        status: "playing",
        level: action.level,
        seed: action.seed,
        pool,
        roundsInGame: roundsForPool(pool.length),
        lineup,
        cursor: 1,
        round: newRound(first, 0),
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
      if (!round || !isRoundOver(round)) return state;

      const nextIndex = round.index + 1;
      const next = state.lineup[state.cursor];
      if (nextIndex >= state.roundsInGame || !next) {
        return { ...state, status: "finished", round: null };
      }
      return { ...state, cursor: state.cursor + 1, round: newRound(next, nextIndex) };
    }

    case "skipUnavailablePhoto": {
      const round = state.round;
      // Une manche déjà entamée (indice pris, réponse trouvée) n'est pas remplacée :
      // seule une photo en échec dès l'affichage justifie de changer de personne.
      if (!round || isRoundOver(round)) return state;
      // La remplaçante vient de la réserve, c'est-à-dire de la partie du vivier
      // mélangé qui dépasse les manches prévues. L'ordre reste donc déterminé par
      // la seule graine.
      const replacement = state.lineup[state.cursor];
      if (!replacement) return state;
      return {
        ...state,
        cursor: state.cursor + 1,
        round: newRound(replacement, round.index),
      };
    }

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export { MAX_HINTS, maxHintsFor, ROUNDS_PER_GAME };
