import { describe, expect, it } from "vitest";
import {
  EASY_LEVEL_FROM_YEAR,
  LEVELS,
  LEVEL_IDS,
  getLevel,
  ministersForLevel,
  REGALIAN_PORTFOLIOS,
} from "./levels";
import { MINISTERS } from "./ministers";
import type { Mandate, Minister } from "./types";

function mandate(over: Partial<Mandate>): Mandate {
  return {
    portfolio: "interieur",
    rank: "ministre",
    officialTitle: "Ministre de l'Intérieur",
    startYear: 2000,
    endYear: 2003,
    ...over,
  };
}

function person(id: string, mandates: Mandate[]): Minister {
  return {
    id,
    firstName: "Jean",
    lastName: "Test",
    aliases: [],
    party: "PS",
    politicalFamily: "gauche",
    mandates,
    photo: { commonsFile: `${id}.jpg`, credit: "c", license: "l" },
    sourceUrl: "https://example.org",
    difficulty: 2,
  };
}

describe("critères de chaque niveau", () => {
  const facile = getLevel("facile");
  const intermediaire = getLevel("intermediaire");
  const difficile = getLevel("difficile");

  it("Facile n'accepte que les postes régaliens de plein exercice depuis 1981", () => {
    expect(facile.accepts(mandate({ portfolio: "interieur" }))).toBe(true);
    expect(facile.accepts(mandate({ portfolio: "culture" }))).toBe(false);
    expect(facile.accepts(mandate({ rank: "secretaire-etat" }))).toBe(false);
    expect(facile.accepts(mandate({ startYear: 1962, endYear: 1968 }))).toBe(false);
  });

  it("Facile inclut un mandat à cheval sur le seuil et un mandat en cours", () => {
    expect(
      facile.accepts(mandate({ startYear: 1976, endYear: EASY_LEVEL_FROM_YEAR })),
    ).toBe(true);
    expect(facile.accepts(mandate({ startYear: 2024, endYear: null }))).toBe(true);
    expect(facile.accepts(mandate({ startYear: 1974, endYear: 1980 }))).toBe(false);
  });

  it("Intermédiaire prend tous les ministères mais pas les rangs subalternes", () => {
    expect(
      intermediaire.accepts(mandate({ portfolio: "culture", startYear: 1959 })),
    ).toBe(true);
    expect(intermediaire.accepts(mandate({ rank: "ministre-delegue" }))).toBe(false);
    expect(intermediaire.accepts(mandate({ rank: "secretaire-etat" }))).toBe(false);
  });

  it("Difficile n'exclut rien", () => {
    expect(difficile.accepts(mandate({ rank: "secretaire-etat" }))).toBe(true);
    expect(difficile.accepts(mandate({ rank: "ministre-delegue" }))).toBe(true);
  });
});

describe("ministersForLevel", () => {
  const base = [
    person("regalien-recent", [mandate({ portfolio: "justice", startYear: 2009 })]),
    person("regalien-ancien", [
      mandate({ portfolio: "justice", startYear: 1959, endYear: 1962 }),
    ]),
    person("culture", [mandate({ portfolio: "culture", startYear: 1990 })]),
    person("sde", [
      mandate({ rank: "secretaire-etat", portfolio: "sports", startYear: 2019 }),
    ]),
  ];

  it("sélectionne les personnes ayant au moins un mandat qualifiant", () => {
    expect(ministersForLevel(base, "facile").map((m) => m.id)).toEqual([
      "regalien-recent",
    ]);
    expect(ministersForLevel(base, "intermediaire").map((m) => m.id)).toEqual([
      "regalien-recent",
      "regalien-ancien",
      "culture",
    ]);
    expect(ministersForLevel(base, "difficile")).toHaveLength(4);
  });

  it("garde une personne dès qu'UN de ses mandats qualifie", () => {
    const mixed = person("mixte", [
      mandate({ rank: "secretaire-etat", portfolio: "sports", startYear: 2012 }),
      mandate({ portfolio: "interieur", startYear: 2017 }),
    ]);
    expect(ministersForLevel([mixed], "facile")).toHaveLength(1);
  });
});

describe("les niveaux sont gigognes sur la base réelle", () => {
  const pools = Object.fromEntries(
    LEVEL_IDS.map((id) => [
      id,
      new Set(ministersForLevel(MINISTERS, id).map((m) => m.id)),
    ]),
  );

  it("Facile ⊆ Intermédiaire ⊆ Difficile", () => {
    for (const id of pools["facile"]!) expect(pools["intermediaire"]!.has(id)).toBe(true);
    for (const id of pools["intermediaire"]!)
      expect(pools["difficile"]!.has(id)).toBe(true);
  });

  // Sans ça, choisir un niveau ne changerait rien : la fonctionnalité serait creuse.
  it("chaque niveau est strictement plus large que le précédent", () => {
    expect(pools["facile"]!.size).toBeGreaterThan(0);
    expect(pools["intermediaire"]!.size).toBeGreaterThan(pools["facile"]!.size);
    expect(pools["difficile"]!.size).toBeGreaterThan(pools["intermediaire"]!.size);
  });

  it("chaque vivier permet une partie complète sans répétition", () => {
    for (const id of LEVEL_IDS) {
      expect(pools[id]!.size).toBeGreaterThanOrEqual(10);
    }
  });

  it("expose un libellé et une description pour chaque niveau", () => {
    for (const level of LEVELS) {
      expect(level.label.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
    }
  });
});

describe("REGALIAN_PORTFOLIOS", () => {
  it("couvre les six postes attendus", () => {
    expect([...REGALIAN_PORTFOLIOS].sort()).toEqual([
      "affaires-etrangeres",
      "defense",
      "economie-finances",
      "interieur",
      "justice",
      "premier-ministre",
    ]);
  });
});
