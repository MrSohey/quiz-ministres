import { describe, expect, it } from "vitest";
import { isDiscriminatingWord, isPortfolioCorrect, resolvePortfolio } from "./matching";
import { PORTFOLIOS } from "./portfolios";
import type { Minister } from "./types";

describe("resolvePortfolio — cas de référence : affaires étrangères", () => {
  const accepted = [
    "Ministère de l'Europe et des Affaires étrangères",
    "ministère des affaires étrangères",
    "affaires étrangères",
    "affaires etrangeres",
    "europe et affaires étrangères",
    "Affaires Étrangères",
    "relations extérieures",
    "quai d'orsay",
    "quai d’orsay",
    "mae",
    "MAE",
    "meae",
    "maedi",
    "afaires étrangères", // faute de frappe
    "affaires étrangéres", // accent mal placé
  ];

  for (const input of accepted) {
    it(`accepte « ${input} »`, () => {
      expect(resolvePortfolio(input)).toContain("affaires-etrangeres");
    });
  }
});

describe("resolvePortfolio — sigles", () => {
  // Le garde-fou principal : sur trois lettres, une tolérance d'un caractère
  // rendrait tous les sigles équivalents.
  it("n'applique aucune tolérance aux sigles", () => {
    expect(resolvePortfolio("mea")).toEqual([]);
    expect(resolvePortfolio("mad")).toEqual([]);
    expect(resolvePortfolio("xyz")).toEqual([]);
  });

  it("ne confond pas deux sigles voisins", () => {
    expect(resolvePortfolio("mae")).toEqual(["affaires-etrangeres"]);
    expect(resolvePortfolio("men")).toEqual(["education-nationale"]);
  });

  // Régression : « santé », « ville » et « bercy » font cinq lettres sans espace et
  // ont été un temps pris pour des sigles inconnus, donc rejetés.
  it("ne prend pas un mot court réel pour un sigle", () => {
    expect(resolvePortfolio("santé")).toEqual(["sante-solidarites"]);
    expect(resolvePortfolio("ville")).toEqual(["logement"]);
    expect(resolvePortfolio("bercy")).toEqual(["economie-finances"]);
  });
});

describe("resolvePortfolio — mots non discriminants", () => {
  it("rejette un mot présent chez plusieurs portefeuilles", () => {
    expect(isDiscriminatingWord("affaires")).toBe(false);
    expect(isDiscriminatingWord("nationale")).toBe(false);
    expect(resolvePortfolio("affaires")).toEqual([]);
  });

  it("reconnaît un mot propre à un seul portefeuille", () => {
    expect(isDiscriminatingWord("étrangères")).toBe(true);
    expect(isDiscriminatingWord("agriculture")).toBe(true);
  });

  it("rejette une saisie faite uniquement de mots vides", () => {
    expect(resolvePortfolio("ministère de")).toEqual([]);
    expect(resolvePortfolio("ministre")).toEqual([]);
    expect(resolvePortfolio("")).toEqual([]);
  });
});

/**
 * L'invariant qui protège la table sur la durée : ajouter une appellation ambiguë
 * fait échouer ce test, sans qu'on ait à y penser.
 */
describe("invariant anti-collision sur toute la table", () => {
  for (const portfolio of PORTFOLIOS) {
    const labels = [
      portfolio.canonicalLabel,
      ...portfolio.aliases,
      ...portfolio.acronyms,
    ];
    for (const label of labels) {
      it(`« ${label} » ne résout que vers ${portfolio.id}`, () => {
        expect(resolvePortfolio(label)).toEqual([portfolio.id]);
      });
    }
  }
});

describe("isPortfolioCorrect", () => {
  const juppe: Minister = {
    id: "alain-juppe",
    firstName: "Alain",
    lastName: "Juppé",
    aliases: [],
    party: "RPR",
    politicalFamily: "droite",
    mandates: [
      {
        portfolio: "affaires-etrangeres",
        rank: "ministre",
        officialTitle: "Ministre des Affaires étrangères",
        startYear: 1993,
        endYear: 1995,
      },
      {
        portfolio: "premier-ministre",
        rank: "ministre",
        officialTitle: "Premier ministre",
        startYear: 1995,
        endYear: 1997,
      },
    ],
    photo: { commonsFile: "x.jpg", credit: "c", license: "l" },
    sourceUrl: "https://example.org",
    difficulty: 2,
  };

  it("accepte n'importe lequel des ministères occupés", () => {
    expect(isPortfolioCorrect("affaires étrangères", juppe)).toBe(true);
    expect(isPortfolioCorrect("mae", juppe)).toBe(true);
    expect(isPortfolioCorrect("premier ministre", juppe)).toBe(true);
    expect(isPortfolioCorrect("matignon", juppe)).toBe(true);
  });

  it("refuse un ministère jamais occupé", () => {
    expect(isPortfolioCorrect("agriculture", juppe)).toBe(false);
    expect(isPortfolioCorrect("culture", juppe)).toBe(false);
    expect(isPortfolioCorrect("", juppe)).toBe(false);
  });
});
