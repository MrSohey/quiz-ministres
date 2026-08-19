import { describe, expect, it } from "vitest";
import { shuffle } from "./deck";
import { MINISTERS } from "./ministers";
import { createSeededRng, isValidSeed, poolFingerprint, randomSeed } from "./seed";

describe("createSeededRng", () => {
  it("produit la même suite pour une même graine", () => {
    const a = createSeededRng("abc123");
    const b = createSeededRng("abc123");
    const suiteA = Array.from({ length: 20 }, () => a());
    const suiteB = Array.from({ length: 20 }, () => b());
    expect(suiteA).toEqual(suiteB);
  });

  it("produit des suites différentes pour des graines différentes", () => {
    const a = Array.from({ length: 10 }, createSeededRng("aaa"));
    const b = Array.from({ length: 10 }, createSeededRng("aab"));
    expect(a).not.toEqual(b);
  });

  it("reste dans [0, 1[", () => {
    const rng = createSeededRng("bornes");
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("ne dégénère pas : la distribution couvre tout l'intervalle", () => {
    const rng = createSeededRng("distribution");
    const seaux = new Set<number>();
    for (let i = 0; i < 1000; i++) seaux.add(Math.floor(rng() * 10));
    expect(seaux.size).toBe(10);
  });

  // La propriété qui porte tout le défi partagé : deux joueurs, même graine, même
  // ordre de passage.
  it("donne le même ordre de passage à deux joueurs", () => {
    const joueurA = shuffle(MINISTERS, createSeededRng("facile:k3m9qz"));
    const joueurB = shuffle(MINISTERS, createSeededRng("facile:k3m9qz"));
    expect(joueurA.map((m) => m.id)).toEqual(joueurB.map((m) => m.id));
  });

  it("donne un ordre différent au même joueur sur un autre niveau", () => {
    const facile = shuffle(MINISTERS, createSeededRng("facile:k3m9qz"));
    const difficile = shuffle(MINISTERS, createSeededRng("difficile:k3m9qz"));
    expect(facile.map((m) => m.id)).not.toEqual(difficile.map((m) => m.id));
  });
});

describe("randomSeed", () => {
  it("engendre une graine valide", () => {
    for (let i = 0; i < 50; i++) expect(isValidSeed(randomSeed())).toBe(true);
  });

  it("ne répète pas la même graine à chaque appel", () => {
    const graines = new Set(Array.from({ length: 100 }, randomSeed));
    expect(graines.size).toBeGreaterThan(90);
  });
});

describe("isValidSeed", () => {
  it("accepte une graine ordinaire", () => {
    expect(isValidSeed("k3m9qz")).toBe(true);
    expect(isValidSeed("a")).toBe(true);
  });

  // Une graine vient de l'URL : elle est sous le contrôle de qui envoie le lien.
  it("rejette ce qui pourrait venir d'une URL bricolée", () => {
    expect(isValidSeed("")).toBe(false);
    expect(isValidSeed("MAJUSCULES")).toBe(false);
    expect(isValidSeed("avec espace")).toBe(false);
    expect(isValidSeed("point.virgule")).toBe(false);
    expect(isValidSeed("a".repeat(17))).toBe(false);
  });
});

describe("poolFingerprint", () => {
  it("est stable d'un appel à l'autre", () => {
    expect(poolFingerprint(MINISTERS)).toBe(poolFingerprint(MINISTERS));
  });

  it("ne dépend pas de l'ordre du vivier", () => {
    const inverse = [...MINISTERS].reverse();
    expect(poolFingerprint(inverse)).toBe(poolFingerprint(MINISTERS));
  });

  // C'est ce qui permet d'avertir le joueur quand la base a changé depuis le défi.
  it("change dès qu'une fiche entre ou sort du vivier", () => {
    const ampute = MINISTERS.slice(0, -1);
    expect(poolFingerprint(ampute)).not.toBe(poolFingerprint(MINISTERS));
  });
});
