import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { AnswerForm } from "./components/AnswerForm";
import { CreditsPage } from "./components/CreditsPage";
import { EndScreen } from "./components/EndScreen";
import { HintPanel } from "./components/HintPanel";
import { LevelPicker } from "./components/LevelPicker";
import { PhotoCard } from "./components/PhotoCard";
import { RevealPanel } from "./components/RevealPanel";
import { ScoreBar } from "./components/ScoreBar";
import { ShareChallenge } from "./components/ShareChallenge";
import { ShareLinkButton } from "./components/ShareLinkButton";
import { StaleChallengeNotice } from "./components/StaleChallengeNotice";
import { challengeUrl, decodeChallenge, type Challenge } from "./game/challenge";
import { bestScoreStorageKey } from "./game/config";
import { hasMoreHints, hintsFor, maxHintsFor } from "./game/hints";
import { getLevel, LEVEL_IDS, ministersForLevel, type LevelId } from "./game/levels";
import { MINISTERS } from "./game/ministers";
import { photoUrl } from "./game/photoUrl";
import { poolFingerprint, randomSeed } from "./game/seed";
import {
  gameReducer,
  initialState,
  isRoundOver,
  type AnswerField,
  type GameState,
} from "./game/reducer";
import type { Minister } from "./game/types";

type BestScores = Record<LevelId, number>;

/**
 * Meilleurs scores, seule chose persistée. `localStorage`, pas de cookie : donnée
 * strictement fonctionnelle, first-party, jamais transmise — pas de bannière.
 */
function readBestScores(): BestScores {
  const scores = {} as BestScores;
  for (const id of LEVEL_IDS) {
    scores[id] = 0;
    try {
      const raw = localStorage.getItem(bestScoreStorageKey(id));
      const value = raw === null ? 0 : Number.parseInt(raw, 10);
      if (Number.isFinite(value) && value > 0) scores[id] = value;
    } catch {
      // Navigation privée ou stockage refusé : le jeu doit rester jouable.
    }
  }
  return scores;
}

function writeBestScore(levelId: LevelId, score: number): void {
  try {
    localStorage.setItem(bestScoreStorageKey(levelId), String(score));
  } catch {
    /* sans importance : le score de la partie reste affiché */
  }
}

/** Défi présent dans l'URL au chargement de la page, le cas échéant. */
function readChallengeFromUrl(): Challenge | null {
  try {
    return decodeChallenge(window.location.search);
  } catch {
    // Une URL bricolée ne doit jamais empêcher le jeu de démarrer.
    return null;
  }
}

/** Retire le paramètre de défi sans recharger la page ni empiler d'historique. */
function clearChallengeFromUrl(): void {
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState(null, "", url.toString());
}

/**
 * Inscrit la partie en cours dans l'URL, dès la première manche.
 *
 * Le lien est ainsi partageable tout de suite, sans attendre l'écran de fin. Effet
 * de bord assumé : recharger la page rejoue la même partie plutôt que d'en tirer une
 * nouvelle — ce qui vaut mieux, un rafraîchissement accidentel ne coûtant plus le
 * tirage.
 *
 * `replaceState` et non `pushState` : la partie n'est pas une étape de navigation,
 * et empiler une entrée par manche rendrait le bouton « retour » inutilisable.
 */
function writeChallengeToUrl(challenge: Challenge): void {
  window.history.replaceState(null, "", challengeUrl(challenge, window.location.href));
}

/**
 * État de départ : partie déjà lancée si la page a été ouverte via un lien de défi.
 *
 * Le démarrage se fait ici plutôt que dans un effet, pour deux raisons. Un effet qui
 * appelle `setState` provoque un rendu en cascade, et surtout l'URL est une donnée
 * disponible dès le premier rendu — il n'y a rien à synchroniser après coup.
 *
 * L'initialiseur est lui aussi doublement invoqué par React StrictMode. Ce n'est
 * anodin que parce que le réducteur est pur et que l'ordre de passage découle de la
 * seule graine : les deux appels produisent un état identique.
 */
function createInitialState(ministers: readonly Minister[]): GameState {
  const base = initialState(ministers);
  const challenge = readChallengeFromUrl();
  if (!challenge) return base;
  return gameReducer(base, {
    type: "start",
    level: challenge.level,
    seed: challenge.seed,
  });
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, MINISTERS, createInitialState);
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [showCredits, setShowCredits] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(readChallengeFromUrl);

  const { round, status, level, seed } = state;

  // Le préchargement n'est pas un confort : c'est lui qui masque les deux
  // redirections de Special:FilePath (CLAUDE.md §6.3).
  const nextFile = state.lineup[state.cursor]?.photo.commonsFile;
  useEffect(() => {
    if (!nextFile) return;
    const image = new Image();
    image.src = photoUrl(nextFile);
  }, [nextFile]);

  // Record du niveau figé au démarrage. Comparer au record courant ne marche pas :
  // l'effet qui l'enregistre le met à jour, et « Nouveau record ! » disparaîtrait
  // au rendu suivant. Une partie ouverte par lien démarre sans passer par `start`,
  // d'où la lecture ici aussi.
  const [bestBeforeGame, setBestBeforeGame] = useState(() => {
    const fromUrl = readChallengeFromUrl();
    return fromUrl ? readBestScores()[fromUrl.level] : 0;
  });
  const isNewBest = status === "finished" && state.score > bestBeforeGame;

  const start = useCallback((levelId: LevelId, withSeed?: string) => {
    const seed = withSeed ?? randomSeed();
    setBestBeforeGame(readBestScores()[levelId]);
    dispatch({ type: "start", level: levelId, seed });
    writeChallengeToUrl({
      level: levelId,
      seed,
      fingerprint: poolFingerprint(ministersForLevel(MINISTERS, levelId)),
    });
  }, []);

  const leaveChallenge = useCallback(() => {
    clearChallengeFromUrl();
    setChallenge(null);
    dispatch({ type: "reset" });
  }, []);

  const submit = useCallback(
    (field: AnswerField, value: string) => dispatch({ type: "submit", field, value }),
    [],
  );

  const hints = useMemo(
    () => (round ? hintsFor(round.minister, round.hintsUsed) : []),
    [round],
  );

  /**
   * Empreinte du vivier du niveau joué. Une graine fige le tirage, pas les données :
   * comparer les empreintes est le seul moyen de savoir si le défi reçu porte encore
   * sur la même base.
   */
  const fingerprint = useMemo(
    () => (level ? poolFingerprint(ministersForLevel(MINISTERS, level)) : null),
    [level],
  );
  const sameBase = challenge === null || challenge.fingerprint === fingerprint;

  const shareUrl = useMemo(() => {
    if (!level || !seed || !fingerprint) return null;
    return challengeUrl({ level, seed, fingerprint }, window.location.href);
  }, [level, seed, fingerprint]);

  const backToLevels = useCallback(() => {
    clearChallengeFromUrl();
    setChallenge(null);
    dispatch({ type: "reset" });
  }, []);

  /**
   * Passe à la manche suivante, et enregistre le record si c'était la dernière.
   *
   * La persistance est faite ici plutôt que dans un `useEffect` sur `status ===
   * "finished"` : c'est une conséquence directe du clic, pas une synchronisation.
   * Un effet qui appelle `setState` déclenche un rendu en cascade pour rien.
   */
  const goToNextRound = useCallback(() => {
    const isLastRound = round !== null && round.index + 1 >= state.roundsInGame;
    if (isLastRound && level && state.score > bestScores[level]) {
      setBestScores((previous) => ({ ...previous, [level]: state.score }));
      writeBestScore(level, state.score);
    }
    dispatch({ type: "nextRound" });
  }, [round, state.roundsInGame, state.score, level, bestScores]);

  if (showCredits) {
    return (
      <main className="app">
        <CreditsPage onBack={() => setShowCredits(false)} />
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Quiz des ministres</h1>

      {status === "idle" && (
        <LevelPicker ministers={MINISTERS} bestScores={bestScores} onPick={start} />
      )}

      {status === "playing" && !sameBase && (
        <StaleChallengeNotice onRestart={leaveChallenge} />
      )}

      {status === "playing" && round && level && (
        <>
          <ScoreBar
            roundIndex={round.index}
            totalRounds={state.roundsInGame}
            score={state.score}
            streak={state.streak}
            levelLabel={getLevel(level).label}
          />
          {shareUrl && <ShareLinkButton url={shareUrl} />}
          <PhotoCard
            key={round.minister.id}
            commonsFile={round.minister.photo.commonsFile}
            onUnavailable={() => dispatch({ type: "skipUnavailablePhoto" })}
          />

          {/* Les indices restent visibles toute la manche, mais passent au-dessus
              de la révélation pour que l'action principale reste en dernier. */}
          {isRoundOver(round) ? (
            <>
              <HintPanel hints={hints} />
              <RevealPanel
                round={round}
                isLastRound={round.index + 1 >= state.roundsInGame}
                onNext={goToNextRound}
              />
            </>
          ) : (
            <>
              <AnswerForm
                key={round.minister.id}
                round={round}
                canHint={hasMoreHints(round.minister, round.hintsUsed)}
                hintsUsed={round.hintsUsed}
                maxHints={maxHintsFor(round.minister)}
                onSubmit={submit}
                onHint={() => dispatch({ type: "requestHint" })}
                onReveal={() => dispatch({ type: "reveal" })}
                onType={() => dispatch({ type: "dismissRejection" })}
              />
              <HintPanel hints={hints} />
            </>
          )}
        </>
      )}

      {status === "finished" && level && (
        <>
          <EndScreen
            history={state.history}
            score={state.score}
            levelLabel={getLevel(level).label}
            bestScore={Math.max(bestScores[level], state.score)}
            isNewBest={isNewBest}
            onRestart={() => start(level)}
            onChangeLevel={backToLevels}
          />
          {shareUrl && <ShareChallenge url={shareUrl} />}
        </>
      )}

      <footer className="credit">
        <button type="button" onClick={() => setShowCredits(true)}>
          Crédits photographiques
        </button>
      </footer>
    </main>
  );
}
