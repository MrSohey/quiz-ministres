import { getLevel, type LevelId } from "../game/levels";

interface Props {
  level: LevelId;
  /** Faux quand la base a changé depuis la création du défi. */
  sameBase: boolean;
  onLeave: () => void;
}

/**
 * Bandeau affiché quand la partie provient d'un lien partagé. Voir CLAUDE.md §7.7.
 *
 * Il sert autant à situer le joueur qu'à l'avertir honnêtement : une graine fige le
 * tirage, pas les données. Si la base a bougé depuis, la promesse « les mêmes
 * photos » ne tient plus et il vaut mieux le dire que le laisser croire.
 */
export function ChallengeBanner({ level, sameBase, onLeave }: Props) {
  return (
    <aside className={`challenge ${sameBase ? "" : "challenge--stale"}`}>
      <p>
        <strong>Défi partagé</strong> — niveau {getLevel(level).label}.{" "}
        {sameBase
          ? "Vous affrontez exactement les mêmes photos, dans le même ordre."
          : "La base a changé depuis la création de ce défi : les photos tirées peuvent différer de celles de votre adversaire."}
      </p>
      <button type="button" onClick={onLeave}>
        Quitter le défi
      </button>
    </aside>
  );
}
