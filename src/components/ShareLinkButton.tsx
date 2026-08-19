import { useClipboard } from "./useClipboard";

interface Props {
  url: string;
}

/**
 * Partage en cours de partie. Voir CLAUDE.md §7.7.
 *
 * La graine figure dans l'URL dès la première manche, donc la barre d'adresse
 * suffirait en théorie. En pratique elle est masquée sur mobile dès qu'on fait
 * défiler la page : sans ce bouton, « partager tout de suite » n'est pas atteignable
 * là où le jeu se joue le plus.
 */
export function ShareLinkButton({ url }: Props) {
  const { copied, copy } = useClipboard();

  return (
    <p className="share-inline">
      <button type="button" className="share-inline__button" onClick={() => copy(url)}>
        Partager cette partie
      </button>
      <span className="muted" role="status">
        {copied ? "Lien copié." : " "}
      </span>
    </p>
  );
}
