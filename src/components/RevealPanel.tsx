import { photoDescriptionUrl } from "../game/photoUrl";
import type { Round } from "../game/reducer";

interface Props {
  round: Round;
  isLastRound: boolean;
  onNext: () => void;
}

export function RevealPanel({ round, isLastRound, onNext }: Props) {
  const { minister, points } = round;
  const solved = round.nameFound && round.portfolioFound;

  return (
    <section className="panel reveal" aria-live="polite">
      <h2>
        {minister.firstName} {minister.lastName}
      </h2>
      <p className="reveal__party">
        {minister.party ?? "Sans étiquette politique connue"}
      </p>

      <ul className="reveal__mandates">
        {minister.mandates.map((mandate) => (
          <li key={`${mandate.portfolio}-${mandate.startYear}`}>
            {mandate.officialTitle}{" "}
            <span className="reveal__years">
              ({mandate.startYear}–{mandate.endYear ?? "en cours"})
            </span>
          </li>
        ))}
      </ul>

      <p className="reveal__points">
        {solved ? "Trouvé" : "Réponse donnée"} — {points ?? 0} point
        {(points ?? 0) > 1 ? "s" : ""}
      </p>

      <p className="credit">
        Photo&nbsp;: {minister.photo.credit} — {minister.photo.license} —{" "}
        <a
          href={photoDescriptionUrl(minister.photo.commonsFile)}
          target="_blank"
          rel="noreferrer"
        >
          Wikimedia Commons
        </a>
        <br />
        <a href={minister.sourceUrl} target="_blank" rel="noreferrer">
          En savoir plus sur cette personne
        </a>
      </p>

      <button type="button" className="primary" onClick={onNext} autoFocus>
        {isLastRound ? "Voir le résultat" : "Personne suivante"}
      </button>
    </section>
  );
}
