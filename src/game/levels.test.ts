import { describe, expect, it } from "vitest";
import {
  LEVELS,
  LEVEL_IDS,
  MODERN_FROM_YEAR,
  RECENT_FROM_YEAR,
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
  const tresFacile = getLevel("tres-facile");
  const facile = getLevel("facile");
  const intermediaire = getLevel("intermediaire");
  const difficile = getLevel("difficile");
  const tresDifficile = getLevel("tres-difficile");

  it("Très facile n'accepte que les régaliens de plein exercice depuis 2017", () => {
    expect(tresFacile.accepts(mandate({ startYear: 2020, endYear: 2022 }))).toBe(true);
    expect(tresFacile.accepts(mandate({ portfolio: "culture", startYear: 2020 }))).toBe(
      false,
    );
    expect(tresFacile.accepts(mandate({ rank: "secretaire-etat" }))).toBe(false);
    // 2003 est postérieur à 2002 mais antérieur à 2017 : Facile, pas Très facile.
    expect(tresFacile.accepts(mandate({}))).toBe(false);
    expect(facile.accepts(mandate({}))).toBe(true);
  });

  it("Facile élargit l'année sans toucher au périmètre régalien", () => {
    expect(facile.accepts(mandate({ startYear: 2005, endYear: 2007 }))).toBe(true);
    expect(facile.accepts(mandate({ portfolio: "culture", startYear: 2005 }))).toBe(
      false,
    );
    expect(facile.accepts(mandate({ startYear: 1985, endYear: 1988 }))).toBe(false);
  });

  it("inclut un mandat à cheval sur le seuil et un mandat en cours", () => {
    expect(
      tresFacile.accepts(mandate({ startYear: 2014, endYear: RECENT_FROM_YEAR })),
    ).toBe(true);
    expect(facile.accepts(mandate({ startYear: 1997, endYear: MODERN_FROM_YEAR }))).toBe(
      true,
    );
    expect(tresFacile.accepts(mandate({ startYear: 2024, endYear: null }))).toBe(true);
    expect(facile.accepts(mandate({ startYear: 1997, endYear: 2001 }))).toBe(false);
  });

  it("Intermédiaire élargit le périmètre sans toucher à l'année", () => {
    expect(
      intermediaire.accepts(mandate({ portfolio: "culture", startYear: 2005 })),
    ).toBe(true);
    expect(intermediaire.accepts(mandate({ portfolio: "culture", endYear: 1990 }))).toBe(
      false,
    );
    expect(intermediaire.accepts(mandate({ rank: "ministre-delegue" }))).toBe(false);
  });

  it("Difficile remonte à 1958 mais garde les rangs de plein exercice", () => {
    expect(difficile.accepts(mandate({ portfolio: "culture", endYear: 1962 }))).toBe(
      true,
    );
    expect(difficile.accepts(mandate({ rank: "ministre-delegue" }))).toBe(false);
    expect(difficile.accepts(mandate({ rank: "secretaire-etat" }))).toBe(false);
  });

  it("Très difficile n'exclut rien", () => {
    expect(tresDifficile.accepts(mandate({ rank: "secretaire-etat" }))).toBe(true);
    expect(tresDifficile.accepts(mandate({ rank: "ministre-delegue" }))).toBe(true);
  });
});

describe("ministersForLevel", () => {
  const base = [
    person("regalien-2020", [
      mandate({ portfolio: "justice", startYear: 2020, endYear: 2022 }),
    ]),
    person("regalien-2005", [
      mandate({ portfolio: "justice", startYear: 2005, endYear: 2007 }),
    ]),
    person("regalien-1959", [
      mandate({ portfolio: "justice", startYear: 1959, endYear: 1962 }),
    ]),
    person("culture-2005", [
      mandate({ portfolio: "culture", startYear: 2005, endYear: 2007 }),
    ]),
    person("sde", [
      mandate({
        rank: "secretaire-etat",
        portfolio: "sports",
        startYear: 2019,
        endYear: 2022,
      }),
    ]),
  ];

  it("sélectionne les personnes ayant au moins un mandat qualifiant", () => {
    const ids = (level: (typeof LEVEL_IDS)[number]) =>
      ministersForLevel(base, level).map((m) => m.id);
    expect(ids("tres-facile")).toEqual(["regalien-2020"]);
    expect(ids("facile")).toEqual(["regalien-2020", "regalien-2005"]);
    expect(ids("intermediaire")).toEqual([
      "regalien-2020",
      "regalien-2005",
      "culture-2005",
    ]);
    expect(ids("difficile")).toEqual([
      "regalien-2020",
      "regalien-2005",
      "regalien-1959",
      "culture-2005",
    ]);
    expect(ids("tres-difficile")).toHaveLength(5);
  });

  it("garde une personne dès qu'UN de ses mandats qualifie", () => {
    const mixed = person("mixte", [
      mandate({
        rank: "secretaire-etat",
        portfolio: "sports",
        startYear: 2012,
        endYear: 2014,
      }),
      mandate({ portfolio: "interieur", startYear: 2019, endYear: 2022 }),
    ]);
    expect(ministersForLevel([mixed], "tres-facile")).toHaveLength(1);
  });
});

describe("les niveaux sont gigognes sur la base réelle", () => {
  const pools = LEVEL_IDS.map(
    (id) => new Set(ministersForLevel(MINISTERS, id).map((m) => m.id)),
  );

  it("chaque niveau contient le précédent", () => {
    for (let i = 1; i < pools.length; i++) {
      for (const id of pools[i - 1]!) expect(pools[i]!.has(id)).toBe(true);
    }
  });

  // Sans ça, choisir un niveau ne changerait rien : la fonctionnalité serait creuse.
  it("chaque niveau est strictement plus large que le précédent", () => {
    for (let i = 1; i < pools.length; i++) {
      expect(pools[i]!.size).toBeGreaterThan(pools[i - 1]!.size);
    }
  });

  it("chaque vivier permet une partie complète sans répétition", () => {
    for (const pool of pools) expect(pool.size).toBeGreaterThanOrEqual(10);
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
