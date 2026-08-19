import type { Round } from "../game/reducer";

interface Props {
  history: readonly Round[];
  score: number;
  levelLabel: string;
  bestScore: number;
  isNewBest: boolean;
  onRestart: () => void;
  onChangeLevel: () => void;
}

export function EndScreen({
  history,
  score,
  levelLabel,
  bestScore,
  isNewBest,
  onRestart,
  onChangeLevel,
}: Props) {
  const perfect = history.filter((r) => r.nameFound && r.portfolioFound).length;

  return (
    <section className="panel">
      <h2>Partie terminée — niveau {levelLabel}</h2>
      <p className="reveal__points">{score} points</p>
      <p>
        {perfect} personne{perfect > 1 ? "s" : ""} sur {history.length} entièrement
        identifiée{perfect > 1 ? "s" : ""}.
      </p>
      <p className={isNewBest ? "score-bar__streak" : "muted"}>
        {isNewBest
          ? "Nouveau record !"
          : `Votre record en ${levelLabel} : ${bestScore} points.`}
      </p>

      <h3>Récapitulatif</h3>
      <ul className="recap">
        {history.map((round) => (
          <li key={`${round.index}-${round.minister.id}`}>
            <span>
              {round.minister.firstName} {round.minister.lastName}
            </span>
            <span className="recap__points">{round.points ?? 0} pts</span>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="primary" onClick={onRestart} autoFocus>
          Rejouer en {levelLabel}
        </button>
        <button type="button" onClick={onChangeLevel}>
          Changer de niveau
        </button>
      </div>
    </section>
  );
}
