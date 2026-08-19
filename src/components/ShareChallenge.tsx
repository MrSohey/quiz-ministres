import { useEffect, useState } from "react";

interface Props {
  url: string;
}

/**
 * Bouton de partage du défi. Voir CLAUDE.md §7.7.
 *
 * Le presse-papiers n'est pas garanti : il exige un contexte sécurisé et peut être
 * refusé par l'utilisateur. Le lien reste donc toujours visible et sélectionnable,
 * le bouton n'étant qu'un raccourci.
 */
export function ShareChallenge({ url }: Props) {
  const [copied, setCopied] = useState(false);

  // Le message de confirmation s'efface seul plutôt que de rester indéfiniment.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    void navigator.clipboard
      .writeText(url)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

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
        <button type="button" onClick={copy}>
          Copier
        </button>
      </div>
      {/* `role="status"` fait annoncer la confirmation par les lecteurs d'écran. */}
      <p className="muted" role="status">
        {copied ? "Lien copié." : " "}
      </p>
    </section>
  );
}
