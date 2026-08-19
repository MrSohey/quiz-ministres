import { describe, expect, it } from "vitest";
import { createLineup, shuffle, type Rng } from "./deck";

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

  it("ne renvoie pas systématiquement le même ordre", () => {
    const ordres = new Set(
      Array.from({ length: 20 }, (_, i) => shuffle(ITEMS, seededRng(i + 1)).join("")),
    );
    expect(ordres.size).toBeGreaterThan(1);
  });
});

describe("createLineup", () => {
  // C'est cette propriété qui garantit qu'une personne n'apparaît jamais deux fois
  // dans une partie : l'ordre de passage est une permutation du vivier.
  it("est une permutation du vivier, sans doublon ni omission", () => {
    const lineup = createLineup(ITEMS, seededRng(7));
    expect(lineup).toHaveLength(ITEMS.length);
    expect(new Set(lineup).size).toBe(ITEMS.length);
  });

  it("couvre tout le vivier, pas seulement les manches prévues", () => {
    // Le surplus sert de réserve quand une photo est indisponible : sans lui, le
    // remplacement n'aurait aucune carte à servir.
    const grand = Array.from({ length: 50 }, (_, i) => `m${i}`);
    expect(createLineup(grand, seededRng(3))).toHaveLength(50);
  });

  it("refuse un vivier vide", () => {
    expect(() => createLineup([], seededRng(1))).toThrow();
  });

  it("fonctionne avec un vivier d'un seul élément", () => {
    expect(createLineup(["seul"], seededRng(1))).toEqual(["seul"]);
  });
});
