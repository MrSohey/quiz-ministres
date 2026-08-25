import { useState } from "react";
import { MAX_MESSAGE_LENGTH, issueUrl } from "../game/issueUrl";
import type { Minister } from "../game/types";

interface Props {
  minister: Minister;
}

/**
 * L'exemple porte sur un mandat manquant, de loin le défaut le plus fréquent :
 * Wikidata sous-déclare les mandats, au point qu'il a fallu en ajouter 221 d'un
 * coup. Suggérer une correction de date orientait vers un cas bien plus rare.
 *
 * Formulation neutre en genre, comme partout dans l'interface (CLAUDE.md §8.3) :
 * « cette personne », jamais « il » ni « elle ».
 */
const PLACEHOLDER =
  "Par exemple : il manque un mandat, cette personne a aussi été ministre du Logement.";

/**
 * Signalement d'une erreur de fiche, par ouverture d'une issue GitHub pré-remplie.
 *
 * Les données viennent de Wikidata et de Wikipédia, qui se trompent : un audit a
 * relevé des erreurs sur plus de la moitié des fiches. Les joueurs sont les mieux
 * placés pour repérer les suivantes, encore faut-il que ce soit sans friction.
 *
 * Le déclencheur est un `<a>` et non un `window.open` : une navigation issue d'un
 * clic passe les bloqueurs de fenêtres, un appel programmatique pas toujours.
 *
 * Le champ est facultatif. Une fiche identifiée sans commentaire reste un
 * signalement exploitable, alors qu'un formulaire obligatoire décourage.
 */
export function ReportErrorForm({ minister }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const fieldId = `report-${minister.id}`;

  if (!open) {
    return (
      <button
        type="button"
        className="report__toggle"
        aria-expanded={false}
        onClick={() => setOpen(true)}
      >
        Signaler une erreur
      </button>
    );
  }

  return (
    <div className="report">
      <label htmlFor={fieldId}>Que faut-il corriger sur cette fiche&nbsp;?</label>
      <textarea
        id={fieldId}
        className="report__message"
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        value={message}
        placeholder={PLACEHOLDER}
        onChange={(event) => setMessage(event.target.value)}
        autoFocus
      />
      <p className="report__hint">
        Le signalement s&apos;ouvre sur GitHub, la fiche déjà décrite. Un compte GitHub
        est nécessaire pour l&apos;envoyer.
      </p>
      <div className="report__actions">
        <a
          className="primary"
          href={issueUrl(minister, message)}
          target="_blank"
          rel="noreferrer"
        >
          Ouvrir le signalement
        </a>
        <button type="button" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </div>
  );
}
