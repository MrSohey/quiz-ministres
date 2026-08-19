import { useClipboard } from "./useClipboard";

interface Props {
  url: string;
}

/**
 * Panneau de partage affiché en fin de partie. Voir CLAUDE.md §7.7.
 *
 * Le lien reste visible et sélectionnable : la copie par le presse-papiers peut
 * échouer, le bouton n'en est qu'un raccourci.
 */
export function ShareChallenge({ url }: Props) {
  const { copied, copy } = useClipboard();

  return (
    <section className="share">
      <h3>Défier quelqu'un</h3>
      <p className="muted">
        Ce lien rejoue exactement la même partie : mêmes personnes, même ordre.
      </p>
      <div className="share__row">
        <input
          className="share__url"
          value={url}
          readOnly
          aria-label="Lien du défi"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" onClick={() => copy(url)}>
          Copier
        </button>
      </div>
      {/* `role="status"` fait annoncer la confirmation par les lecteurs d'écran. */}
      <p className="muted" role="status">
        {copied ? "Lien copié." : " "}
      </p>
    </section>
  );
}
