import { describe, expect, it } from "vitest";
import { isNameCorrect, levenshtein, normalize, toleranceFor } from "./matching";
import type { Minister } from "./types";

const chirac: Minister = {
  id: "jacques-chirac",
  firstName: "Jacques",
  lastName: "Chirac",
  aliases: [],
  party: "RPR",
  politicalFamily: "droite",
  mandates: [
    {
      portfolio: "interieur",
      rank: "ministre",
      officialTitle: "Ministre de l'Intérieur",
      startYear: 1974,
      endYear: 1974,
    },
    {
      portfolio: "premier-ministre",
      rank: "ministre",
      officialTitle: "Premier ministre",
      startYear: 1974,
      endYear: 1976,
    },
  ],
  photo: { commonsFile: "x.jpg", credit: "c", license: "l" },
  sourceUrl: "https://example.org",
  difficulty: 1,
};

const villepin: Minister = {
  ...chirac,
  id: "dominique-de-villepin",
  firstName: "Dominique",
  lastName: "de Villepin",
};

const debre: Minister = {
  ...chirac,
  id: "michel-debre",
  firstName: "Michel",
  lastName: "Debré",
};

describe("normalize", () => {
  it("passe en minuscules et retire les accents", () => {
    expect(normalize("Édith CRESSON")).toBe("edith cresson");
    expect(normalize("Debré")).toBe("debre");
  });

  it("traite tirets et apostrophes comme des séparateurs", () => {
    expect(normalize("Jean-Pierre Raffarin")).toBe("jean pierre raffarin");
    expect(normalize("Quai d'Orsay")).toBe("quai d orsay");
    // Apostrophe typographique, celle que produisent les claviers de téléphone.
    expect(normalize("Quai d’Orsay")).toBe("quai d orsay");
  });

  it("compresse les espaces et supprime la ponctuation résiduelle", () => {
    expect(normalize("  Chirac ,  Jacques !! ")).toBe("chirac jacques");
  });
});

describe("levenshtein", () => {
  it("calcule la distance d'édition", () => {
    expect(levenshtein("chirac", "chirac")).toBe(0);
    expect(levenshtein("chirac", "chirak")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("fabius", "fabien")).toBe(2);
  });
});

describe("toleranceFor", () => {
  it("est d'autant plus stricte que la référence est courte", () => {
    expect(toleranceFor("barre")).toBe(0);
    expect(toleranceFor("chirac")).toBe(1);
    expect(toleranceFor("pompidou")).toBe(1);
    expect(toleranceFor("villepin ab")).toBe(2);
  });
});

describe("isNameCorrect", () => {
  it("accepte le nom complet et le nom seul", () => {
    expect(isNameCorrect("Jacques Chirac", chirac)).toBe(true);
    expect(isNameCorrect("Chirac", chirac)).toBe(true);
    expect(isNameCorrect("chirac", chirac)).toBe(true);
    expect(isNameCorrect("CHIRAC", chirac)).toBe(true);
  });

  it("accepte l'ordre inversé", () => {
    expect(isNameCorrect("Chirac Jacques", chirac)).toBe(true);
  });

  it("tolère une faute de frappe sur un nom assez long", () => {
    expect(isNameCorrect("Jaques Chirac", chirac)).toBe(true);
    expect(isNameCorrect("Chirak", chirac)).toBe(true);
  });

  it("rend les particules facultatives des deux côtés", () => {
    expect(isNameCorrect("Villepin", villepin)).toBe(true);
    expect(isNameCorrect("de Villepin", villepin)).toBe(true);
    expect(isNameCorrect("Dominique de Villepin", villepin)).toBe(true);
  });

  it("accepte un alias déclaré", () => {
    const withAlias: Minister = { ...chirac, aliases: ["Le Bulldozer"] };
    expect(isNameCorrect("le bulldozer", withAlias)).toBe(true);
  });

  // Le piège documenté au §7.4 : la tolérance ne doit pas avaler des noms
  // réellement différents mais graphiquement proches.
  it("rejette les noms courts proches mais différents", () => {
    expect(isNameCorrect("Debray", debre)).toBe(false);
    expect(isNameCorrect("Fabius", debre)).toBe(false);
  });

  it("rejette une réponse vide ou faite de particules", () => {
    expect(isNameCorrect("", chirac)).toBe(false);
    expect(isNameCorrect("   ", chirac)).toBe(false);
    expect(isNameCorrect("de", chirac)).toBe(false);
  });
});
