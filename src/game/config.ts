/**
 * Toutes les constantes de gameplay, regroupées ici pour pouvoir régler le jeu sans
 * fouiller le code. Voir CLAUDE.md §7.8 et §12.
 */

/**
 * Nombre de manches dans une partie. Plafonné par la taille du vivier du niveau,
 * pour ne jamais montrer deux fois la même personne dans une partie.
 */
export const ROUNDS_PER_GAME = 10;

export function roundsForPool(poolSize: number): number {
  return Math.max(1, Math.min(ROUNDS_PER_GAME, poolSize));
}

/** Points pour le nom trouvé. */
export const POINTS_FOR_NAME = 50;

/** Points pour le ministère trouvé. */
export const POINTS_FOR_PORTFOLIO = 50;

/** Retiré du total de la manche par indice demandé. Plancher à 0. */
export const PENALTY_PER_HINT = 10;

/** Manches consécutives sans indice au-delà desquelles le bonus de série démarre. */
export const STREAK_THRESHOLD = 2;

/** Bonus accordé par manche une fois le seuil de série franchi. */
export const STREAK_BONUS = 25;

/**
 * Version du barème des niveaux, incluse dans la clé de stockage.
 *
 * Le passage à cinq niveaux a changé le SENS de trois identifiants sans changer
 * leur nom : « facile » désignait les régaliens depuis 1981, il désigne maintenant
 * les régaliens depuis 2002. Un record conservé sous l'ancien barème serait comparé
 * à des parties qui n'ont plus rien à voir. On repart donc de zéro plutôt que de
 * transporter un score qui ne veut plus dire la même chose.
 */
const SCALE_VERSION = 2;

/**
 * Clé de stockage du meilleur score, différenciée par niveau : les viviers n'ont
 * pas la même difficulté, un score unique n'aurait pas de sens.
 *
 * `localStorage`, pas de cookie. Donnée strictement fonctionnelle, first-party,
 * jamais transmise : aucune bannière de consentement n'est requise.
 */
export function bestScoreStorageKey(levelId: string): string {
  return `quiz-ministres:best-score:v${SCALE_VERSION}:${levelId}`;
}
