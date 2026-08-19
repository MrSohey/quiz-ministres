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
 * Clé de stockage du meilleur score, différenciée par niveau : les trois viviers
 * n'ont pas la même difficulté, un score unique n'aurait pas de sens.
 *
 * `localStorage`, pas de cookie. Donnée strictement fonctionnelle, first-party,
 * jamais transmise : aucune bannière de consentement n'est requise.
 */
export function bestScoreStorageKey(levelId: string): string {
  return `quiz-ministres:best-score:${levelId}`;
}
