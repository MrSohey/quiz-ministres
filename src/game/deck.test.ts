import { describe, expect, it } from "vitest";
import { createDeck, draw, shuffle, type Rng } from "./deck";

/** Générateur déterministe : la logique de tirage doit être testable sans hasard. */
function seededRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const ITEMS = ["a", "b", "c", "d", "e"] as const;

describe("shuffle", () => {
  it("conserve exactement les mêmes éléments", () => {
    const result = shuffle(ITEMS, seededRng(1));
    expect([...result].sort()).toEqual([...ITEMS].sort());
  });

  it("ne mute pas l'entrée", () => {
    const original = [...ITEMS];
    shuffle(original, seededRng(2));
    expect(original).toEqual([...ITEMS]);
  });

  it("est déterministe pour une graine donnée", () => {
    expect(shuffle(ITEMS, seededRng(42))).toEqual(shuffle(ITEMS, seededRng(42)));
  });
});

describe("draw", () => {
  it("ne répète aucune carte tant que le sac n'est pas vide", () => {
    const rng = seededRng(7);
    let deck = createDeck(ITEMS, rng);
    const drawn: string[] = [];
    for (let i = 0; i < ITEMS.length; i++) {
      const result = draw(deck, ITEMS, rng);
      drawn.push(result.card);
      deck = result.deck;
    }
    expect(new Set(drawn).size).toBe(ITEMS.length);
  });

  it("reconstitue le sac une fois vidé", () => {
    const rng = seededRng(3);
    let deck = createDeck(ITEMS, rng);
    const drawn: string[] = [];
    for (let i = 0; i < ITEMS.length * 3; i++) {
      const result = draw(deck, ITEMS, rng);
      drawn.push(result.card);
      deck = result.deck;
    }
    expect(drawn).toHaveLength(ITEMS.length * 3);
  });

  // Le bug classique du sac : la dernière carte d'un sac ressort en première
  // position du suivant, et le joueur voit deux fois la même photo d'affilée.
  it("ne sert jamais deux fois la même carte de suite, y compris à la jointure", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed);
      let deck = createDeck(ITEMS, rng);
      let previous: string | null = null;
      for (let i = 0; i < ITEMS.length * 4; i++) {
        const result = draw(deck, ITEMS, rng);
        expect(result.card).not.toBe(previous);
        previous = result.card;
        deck = result.deck;
      }
    }
  });

  it("fonctionne avec une base d'un seul élément", () => {
    const rng = seededRng(1);
    const deck = createDeck(["seul"], rng);
    const first = draw(deck, ["seul"], rng);
    expect(first.card).toBe("seul");
    expect(draw(first.deck, ["seul"], rng).card).toBe("seul");
  });
});

describe("createDeck", () => {
  it("refuse une base vide", () => {
    expect(() => createDeck([], seededRng(1))).toThrow();
  });
});
