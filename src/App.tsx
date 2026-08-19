import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { AnswerForm } from "./components/AnswerForm";
import { CreditsPage } from "./components/CreditsPage";
import { EndScreen } from "./components/EndScreen";
import { HintPanel } from "./components/HintPanel";
import { LevelPicker } from "./components/LevelPicker";
import { PhotoCard } from "./components/PhotoCard";
import { RevealPanel } from "./components/RevealPanel";
import { ScoreBar } from "./components/ScoreBar";
import { bestScoreStorageKey } from "./game/config";
import { hasMoreHints, hintsFor, maxHintsFor } from "./game/hints";
import { getLevel, LEVEL_IDS, type LevelId } from "./game/levels";
import { MINISTERS } from "./game/ministers";
import { photoUrl } from "./game/photoUrl";
import { gameReducer, initialState, isRoundOver, type AnswerField } from "./game/reducer";

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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, MINISTERS, initialState);
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [showCredits, setShowCredits] = useState(false);

  const { round, status, deck, level } = state;

  // Le préchargement n'est pas un confort : c'est lui qui masque les deux
  // redirections de Special:FilePath (CLAUDE.md §6.3).
  const nextFile = deck?.remaining[0]?.photo.commonsFile;
  useEffect(() => {
    if (!nextFile) return;
    const image = new Image();
    image.src = photoUrl(nextFile);
  }, [nextFile]);

  // Record du niveau figé au démarrage. Comparer au record courant ne marche pas :
  // l'effet qui l'enregistre le met à jour, et « Nouveau record ! » disparaîtrait
  // au rendu suivant.
  const [bestBeforeGame, setBestBeforeGame] = useState(0);
  const isNewBest = status === "finished" && state.score > bestBeforeGame;

  const start = useCallback((levelId: LevelId) => {
    setBestBeforeGame(readBestScores()[levelId]);
    dispatch({ type: "start", level: levelId, rng: Math.random });
  }, []);

  const submit = useCallback(
    (field: AnswerField, value: string) => dispatch({ type: "submit", field, value }),
    [],
  );

  const hints = useMemo(
    () => (round ? hintsFor(round.minister, round.hintsUsed) : []),
    [round],
  );

  const backToLevels = useCallback(() => dispatch({ type: "reset" }), []);

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
    dispatch({ type: "nextRound", rng: Math.random });
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

      {status === "playing" && round && level && (
        <>
          <ScoreBar
            roundIndex={round.index}
            totalRounds={state.roundsInGame}
            score={state.score}
            streak={state.streak}
            levelLabel={getLevel(level).label}
          />
          <PhotoCard
            key={round.minister.id}
            commonsFile={round.minister.photo.commonsFile}
            onUnavailable={() =>
              dispatch({ type: "skipUnavailablePhoto", rng: Math.random })
            }
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
        <EndScreen
          history={state.history}
          score={state.score}
          levelLabel={getLevel(level).label}
          bestScore={Math.max(bestScores[level], state.score)}
          isNewBest={isNewBest}
          onRestart={() => start(level)}
          onChangeLevel={backToLevels}
        />
      )}

      <footer className="credit">
        <button type="button" onClick={() => setShowCredits(true)}>
          Crédits photographiques
        </button>
      </footer>
    </main>
  );
}
