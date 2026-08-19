/**
 * Tirage aléatoire sans répétition. Voir CLAUDE.md §7.3.
 *
 * Piocher au hasard à chaque manche ferait revenir la même personne deux fois dans
 * une partie de dix manches (paradoxe des anniversaires). On mélange donc la liste
 * une fois et on pioche en tête, comme dans un sac.
 */

/** Source d'aléa injectable, pour que les tests soient déterministes. */
export type Rng = () => number;

export interface Deck<T> {
  readonly remaining: readonly T[];
  readonly lastDrawn: T | null;
}

/** Mélange de Fisher-Yates, sans muter l'entrée. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

export function createDeck<T>(items: readonly T[], rng: Rng): Deck<T> {
  if (items.length === 0) throw new Error("Impossible de créer un sac vide");
  return { remaining: shuffle(items, rng), lastDrawn: null };
}

export interface DrawResult<T> {
  card: T;
  deck: Deck<T>;
}

/**
 * Pioche la carte suivante. Quand le sac est vide il est reconstitué, en garantissant
 * que la première carte du nouveau sac n'est pas celle qui vient d'être vue : sinon
 * la même photo apparaîtrait deux fois de suite à la jointure.
 */
export function draw<T>(deck: Deck<T>, allItems: readonly T[], rng: Rng): DrawResult<T> {
  let remaining = deck.remaining;

  if (remaining.length === 0) {
    remaining = shuffle(allItems, rng);
    if (allItems.length > 1 && remaining[0] === deck.lastDrawn) {
      // Un simple échange avec la deuxième carte suffit et reste équiprobable
      // pour toutes les autres positions.
      const first = remaining[0] as T;
      const second = remaining[1] as T;
      remaining = [second, first, ...remaining.slice(2)];
    }
  }

  const card = remaining[0] as T;
  return { card, deck: { remaining: remaining.slice(1), lastDrawn: card } };
}
