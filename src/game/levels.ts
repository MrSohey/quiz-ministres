/**
 * Niveaux de difficulté. Voir CLAUDE.md §7.6.
 *
 * Les cinq niveaux sont gigognes : tout ce qu'accepte un niveau est accepté par les
 * suivants. Le joueur qui monte retrouve donc les personnes qu'il connaît déjà,
 * noyées dans un ensemble plus large.
 *
 * **Chaque marche ne fait varier qu'un seul paramètre** — l'année, puis le
 * périmètre des portefeuilles, puis l'année, puis le rang. C'est ce qui donne une
 * progression lisible, où chaque vivier fait à peu près le double du précédent :
 * 37, 77, 184, 356, 509. Faire varier deux paramètres à la fois quintuplait le
 * vivier d'un coup, et la marche tombait précisément là où un débutant se cogne.
 */
import type { Mandate, Minister, PortfolioId } from "./types";

export const LEVEL_IDS = [
  "tres-facile",
  "facile",
  "intermediaire",
  "difficile",
  "tres-difficile",
] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

/**
 * Postes régaliens : les ministères que le grand public identifie sans hésiter.
 * Bercy y figure parce que le ministre de l'Économie est, en pratique, aussi
 * exposé médiatiquement que l'Intérieur ou les Affaires étrangères.
 */
export const REGALIAN_PORTFOLIOS: ReadonlySet<PortfolioId> = new Set([
  "premier-ministre",
  "interieur",
  "affaires-etrangeres",
  "justice",
  "defense",
  "economie-finances",
]);

/** Seuil du niveau le plus facile : la mémoire immédiate du grand public. */
export const RECENT_FROM_YEAR = 2017;

/** Seuil des deux niveaux suivants, soit une génération politique. */
export const MODERN_FROM_YEAR = 2002;

export interface Level {
  id: LevelId;
  label: string;
  description: string;
  /** Un mandat suffit-il, à lui seul, à faire entrer la personne dans ce niveau ? */
  accepts: (mandate: Mandate) => boolean;
}

/** Un mandat en cours (`endYear === null`) est forcément postérieur au seuil. */
function heldSince(mandate: Mandate, year: number): boolean {
  return mandate.endYear === null || mandate.endYear >= year;
}

function isFullMinister(mandate: Mandate): boolean {
  return mandate.rank === "ministre";
}

export const LEVELS: readonly Level[] = [
  {
    id: "tres-facile",
    label: "Très facile",
    description: "Postes régaliens depuis 2017",
    accepts: (m) =>
      isFullMinister(m) &&
      REGALIAN_PORTFOLIOS.has(m.portfolio) &&
      heldSince(m, RECENT_FROM_YEAR),
  },
  {
    id: "facile",
    label: "Facile",
    // Seule l'année change : le périmètre reste régalien.
    description: "Postes régaliens depuis 2002",
    accepts: (m) =>
      isFullMinister(m) &&
      REGALIAN_PORTFOLIOS.has(m.portfolio) &&
      heldSince(m, MODERN_FROM_YEAR),
  },
  {
    id: "intermediaire",
    label: "Intermédiaire",
    // Seul le périmètre change : l'année reste 2002.
    description: "Tous les ministères depuis 2002",
    accepts: (m) => isFullMinister(m) && heldSince(m, MODERN_FROM_YEAR),
  },
  {
    id: "difficile",
    label: "Difficile",
    // Seule l'année change : on remonte à l'origine de la Ve République.
    description: "Tous les ministères depuis 1958",
    accepts: isFullMinister,
  },
  {
    id: "tres-difficile",
    label: "Très difficile",
    // Seul le rang change.
    description: "Y compris ministres délégués et secrétaires d'État",
    accepts: () => true,
  },
];

export const LEVEL_BY_ID: ReadonlyMap<LevelId, Level> = new Map(
  LEVELS.map((level) => [level.id, level]),
);

export function getLevel(id: LevelId): Level {
  const level = LEVEL_BY_ID.get(id);
  if (!level) throw new Error(`Niveau inconnu : ${id}`);
  return level;
}

/**
 * Personnes jouables à ce niveau : celles qui ont AU MOINS un mandat qualifiant.
 *
 * Les autres mandats restent des réponses valides — quelqu'un qui reconnaît
 * Gérald Darmanin et répond « budget » a trouvé, même si c'est son mandat à
 * l'Intérieur qui le fait entrer dans les niveaux faciles.
 */
export function ministersForLevel(
  ministers: readonly Minister[],
  levelId: LevelId,
): readonly Minister[] {
  const level = getLevel(levelId);
  return ministers.filter((minister) => minister.mandates.some(level.accepts));
}
