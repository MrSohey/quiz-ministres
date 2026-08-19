/**
 * Échelle d'indices. Voir CLAUDE.md §7.5.
 *
 * Les indices sont demandés explicitement par le joueur et ne se déclenchent jamais
 * tout seuls. Ils vont du plus vague au plus révélateur.
 *
 * Tous les indices ne sont pas disponibles pour toutes les fiches : sans parti connu,
 * les indices « famille politique » et « parti » n'ont rien à dire. Un constructeur
 * renvoie alors `null` et l'indice est escamoté — on n'affiche jamais « parti :
 * inconnu », qui coûterait 10 points pour zéro information.
 */
import type { Minister, PoliticalFamily } from "./types";

const FAMILY_LABELS: Record<PoliticalFamily, string> = {
  gauche: "gauche",
  centre: "centre",
  droite: "droite",
  autre: "inclassable ou sans étiquette",
};

/** Renvoie `null` quand l'indice n'a pas de contenu pour cette personne. */
type HintBuilder = (minister: Minister) => string | null;

const HINT_BUILDERS: readonly HintBuilder[] = [
  (m) => {
    const first = m.mandates[0];
    if (!first) return null;
    const decade = Math.floor(first.startYear / 10) * 10;
    return `A exercé pour la première fois dans les années ${decade}.`;
  },
  (m) =>
    m.politicalFamily === null
      ? null
      : `Famille politique : ${FAMILY_LABELS[m.politicalFamily]}.`,
  (m) => {
    const distinct = new Set(m.mandates.map((mandate) => mandate.portfolio)).size;
    const mandateWord = m.mandates.length > 1 ? "mandats" : "mandat";
    const portfolioWord = distinct > 1 ? "ministères différents" : "ministère";
    return `${m.mandates.length} ${mandateWord}, ${distinct} ${portfolioWord}.`;
  },
  (m) => {
    const initials = `${m.firstName.charAt(0)}. ${m.lastName.charAt(0)}.`;
    const letters = m.lastName.replace(/[^\p{L}]/gu, "").length;
    return `${initials} — nom de famille en ${letters} lettres.`;
  },
  (m) => (m.party === null ? null : `Parti politique : ${m.party}.`),
  // Années uniquement : nommer le ministère ici donnerait la seconde réponse
  // attendue, ce qui viderait la manche de son intérêt.
  (m) => {
    const first = m.mandates[0];
    if (!first) return null;
    const end = first.endYear ?? "aujourd'hui";
    return `Premier mandat exercé de ${first.startYear} à ${end}.`;
  },
];

/** Borne supérieure théorique, quand tous les indices sont disponibles. */
export const MAX_HINTS = HINT_BUILDERS.length;

/** Indices réellement disponibles pour cette personne, dans l'ordre. */
export function availableHints(minister: Minister): string[] {
  const hints: string[] = [];
  for (const build of HINT_BUILDERS) {
    const hint = build(minister);
    if (hint !== null) hints.push(hint);
  }
  return hints;
}

/**
 * Nombre d'indices proposables. Varie d'une fiche à l'autre : c'est ce nombre qui
 * s'affiche dans le bouton « Indice (n/N) », pas la borne théorique.
 */
export function maxHintsFor(minister: Minister): number {
  return availableHints(minister).length;
}

/** Les `count` premiers indices disponibles. */
export function hintsFor(minister: Minister, count: number): string[] {
  const available = availableHints(minister);
  return available.slice(0, Math.max(0, Math.min(count, available.length)));
}

export function hasMoreHints(minister: Minister, count: number): boolean {
  return count < maxHintsFor(minister);
}
