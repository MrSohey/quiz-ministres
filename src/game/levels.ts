/**
 * Niveaux de difficulté. Voir CLAUDE.md §7.7.
 *
 * Les trois niveaux sont gigognes : tout ce qu'accepte Facile est accepté par
 * Intermédiaire, et tout ce qu'accepte Intermédiaire est accepté par Difficile.
 * Le joueur qui monte de niveau retrouve donc les personnes qu'il connaît déjà,
 * noyées dans un ensemble plus large.
 */
import type { Mandate, Minister, PortfolioId } from "./types";

export const LEVEL_IDS = ["facile", "intermediaire", "difficile"] as const;

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

/** Année à partir de laquelle un mandat compte pour le niveau Facile. */
export const EASY_LEVEL_FROM_YEAR = 1981;

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

export const LEVELS: readonly Level[] = [
  {
    id: "facile",
    label: "Facile",
    description: "Postes régaliens depuis 1981",
    accepts: (m) =>
      m.rank === "ministre" &&
      REGALIAN_PORTFOLIOS.has(m.portfolio) &&
      heldSince(m, EASY_LEVEL_FROM_YEAR),
  },
  {
    id: "intermediaire",
    label: "Intermédiaire",
    description: "Tous les ministères depuis 1958",
    accepts: (m) => m.rank === "ministre",
  },
  {
    id: "difficile",
    label: "Difficile",
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
 * l'Intérieur qui le fait entrer dans le niveau Facile.
 */
export function ministersForLevel(
  ministers: readonly Minister[],
  levelId: LevelId,
): readonly Minister[] {
  const level = getLevel(levelId);
  return ministers.filter((minister) => minister.mandates.some(level.accepts));
}
