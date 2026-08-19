import { LEVELS, ministersForLevel, type LevelId } from "../game/levels";
import type { Minister } from "../game/types";

interface Props {
  ministers: readonly Minister[];
  /** Meilleur score par niveau, 0 si jamais joué. */
  bestScores: Record<LevelId, number>;
  onPick: (level: LevelId) => void;
}

export function LevelPicker({ ministers, bestScores, onPick }: Props) {
  return (
    <section className="panel">
      <h2>Choisissez un niveau</h2>
      <p>
        Une photo, deux questions&nbsp;: le nom de la personne et un ministère qu'elle a
        occupé sous la Ve&nbsp;République. Six indices sont disponibles à la demande,
        chacun coûte 10&nbsp;points.
      </p>

      <ul className="levels">
        {LEVELS.map((level, index) => (
          <li key={level.id}>
            <button
              type="button"
              className={index === 0 ? "level primary" : "level"}
              onClick={() => onPick(level.id)}
              autoFocus={index === 0}
            >
              <span className="level__name">{level.label}</span>
              <span className="level__desc">{level.description}</span>
              <span className="level__meta">
                {ministersForLevel(ministers, level.id).length} personnes
                {bestScores[level.id] > 0 && ` · record ${bestScores[level.id]} pts`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="muted">
        Le meilleur score de chaque niveau est conservé dans votre navigateur, en local.
        Aucun cookie, aucun traçage, aucune donnée envoyée.
      </p>
    </section>
  );
}
