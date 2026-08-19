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

  return (
    <section className="panel">
      <h2>Crédits photographiques</h2>
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
