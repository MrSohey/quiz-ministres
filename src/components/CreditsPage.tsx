import { useEffect } from "react";
import { MINISTERS } from "../game/ministers";
import { photoDescriptionUrl } from "../game/photoUrl";

interface Props {
  onBack: () => void;
}

/**
 * Le hotlinking ne dispense pas des obligations de licence : cette page liste
 * l'intégralité des images utilisées, avec leur auteur et leur licence.
 * Voir CLAUDE.md §6.3.
 */
export function CreditsPage({ onBack }: Props) {
  const sorted = [...MINISTERS].sort((a, b) =>
    a.lastName.localeCompare(b.lastName, "fr"),
  );

  // Échapper par « Échap » est le réflexe attendu dès qu'une croix de fermeture
  // existe. S'abonner à un événement du document est le cas d'usage légitime d'un
  // effet : on synchronise avec un système extérieur à React.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <section className="panel credits">
      {/* En-tête collant : la liste fait 206 entrées, exiger de la parcourir en
          entier pour retrouver le bouton de retour serait pénible. */}
      <header className="credits__header">
        <h2>Crédits photographiques</h2>
        <button
          type="button"
          className="credits__close"
          onClick={onBack}
          aria-label="Fermer les crédits et revenir au jeu"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p className="muted">
        Toutes les photographies proviennent de Wikimedia Commons et sont affichées depuis
        leurs serveurs. Elles restent la propriété de leurs auteurs et sont réutilisées
        selon les termes de leur licence.
      </p>

      <ul className="credits-list">
        {sorted.map((minister) => (
          <li key={minister.id}>
            <strong>
              {minister.firstName} {minister.lastName}
            </strong>
            <br />
            {minister.photo.credit} — {minister.photo.license} —{" "}
            <a
              href={photoDescriptionUrl(minister.photo.commonsFile)}
              target="_blank"
              rel="noreferrer"
            >
              fichier source
            </a>
          </li>
        ))}
      </ul>

      <h3>Données</h3>
      <p className="muted">
        Les noms, partis, ministères et dates proviennent de Wikidata et de Wikipédia en
        français. Chaque fiche renvoie vers sa source.
      </p>

      <button type="button" onClick={onBack}>
        Retour au jeu
      </button>
    </section>
  );
}
