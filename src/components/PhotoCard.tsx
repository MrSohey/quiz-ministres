import { useState } from "react";
import { photoUrl } from "../game/photoUrl";

interface Props {
  commonsFile: string;
  /** Appelé si Commons renvoie 404 : la fiche est remplacée (CLAUDE.md §6.3). */
  onUnavailable: () => void;
}

export function PhotoCard({ commonsFile, onUnavailable }: Props) {
  // Pas besoin de réinitialiser `loaded` à chaque personne : App monte le composant
  // avec `key={minister.id}`, donc un changement de fiche le remonte à neuf.
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="photo-card">
      {!loaded && <div className="photo-card__loading">Chargement de la photo…</div>}
      <img
        className="photo-card__image"
        // Le alt ne doit rien divulguer : il est lu par les lecteurs d'écran
        // avant que le joueur ait répondu.
        alt="Portrait de la personne à identifier"
        src={photoUrl(commonsFile)}
        style={loaded ? undefined : { display: "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          console.warn(`Photo introuvable sur Commons : ${commonsFile}`);
          onUnavailable();
        }}
      />
    </div>
  );
}
