import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_LENGTH, issueBody, issueTitle, issueUrl } from "./issueUrl";
import { MINISTERS } from "./ministers";
import type { Minister } from "./types";

const VEIL: Minister = {
  id: "simone-veil",
  firstName: "Simone",
  lastName: "Veil",
  aliases: [],
  party: "UDF",
  politicalFamily: "centre",
  mandates: [
    {
      portfolio: "sante-solidarites",
      officialTitle: "Ministre de la Santé et des Solidarités",
      rank: "ministre",
      startYear: 1974,
      endYear: 1979,
    },
    {
      portfolio: "sante-solidarites",
      officialTitle: "Ministre d'État chargée des Affaires sociales",
      rank: "ministre",
      startYear: 1993,
      endYear: null,
    },
  ],
  photo: {
    commonsFile: "Simone Veil 1984.jpg",
    credit: "Rob Bogaerts",
    license: "CC BY-SA 3.0",
  },
  sourceUrl: "https://www.wikidata.org/wiki/Q123",
  difficulty: 1,
};

describe("issueBody", () => {
  // L'identifiant est la seule clé qui permette de retrouver la ligne dans
  // ministers.json : sans lui, un signalement est inexploitable.
  it("porte l'identifiant de la fiche entre accents graves", () => {
    expect(issueBody(VEIL, "date fausse")).toContain("`simone-veil`");
  });

  it("reprend le message tel quel", () => {
    expect(issueBody(VEIL, "La photo n'est pas la bonne")).toContain(
      "La photo n'est pas la bonne",
    );
  });

  it("liste tous les mandats, y compris celui en cours", () => {
    const body = issueBody(VEIL, "");
    expect(body).toContain("(1974–1979)");
    expect(body).toContain("(1993–en cours)");
  });

  it("dit qu'un parti absent n'est pas renseigné plutôt que d'écrire null", () => {
    const body = issueBody({ ...VEIL, party: null, politicalFamily: null }, "");
    expect(body).toContain("non renseigné");
    expect(body).not.toContain("null");
  });

  // Le bouton reste actif sans texte : la fiche seule est déjà un signalement utile.
  it("reste exploitable quand le message est vide", () => {
    expect(issueBody(VEIL, "   ")).toContain("aucune précision donnée");
  });

  it("borne le message pour ne pas dépasser la limite d'URL de GitHub", () => {
    const body = issueBody(VEIL, "a".repeat(MAX_MESSAGE_LENGTH + 500));
    expect(body).toContain("a".repeat(MAX_MESSAGE_LENGTH));
    expect(body).not.toContain("a".repeat(MAX_MESSAGE_LENGTH + 1));
  });
});

describe("issueUrl", () => {
  it("vise le formulaire de création d'issue du dépôt", () => {
    expect(issueUrl(VEIL, "")).toContain(
      "https://github.com/MrSohey/quiz-ministres/issues/new?",
    );
  });

  // Un corps multi-lignes concaténé à la main casserait l'URL au premier saut
  // de ligne ou à la première apostrophe.
  it("encode les sauts de ligne, les accents et les apostrophes", () => {
    const url = issueUrl(VEIL, "La date de fin est fausse : c'est 1979");
    expect(url).not.toContain("\n");
    expect(url).not.toContain(" ");
    expect(url).toContain("c%27est+1979");
  });

  it("intitule l'issue avec l'identifiant de la fiche", () => {
    expect(issueTitle(VEIL)).toBe("Erreur signalée sur la fiche simone-veil");
    expect(issueUrl(VEIL, "")).toContain("simone-veil");
  });

  // Borner les caractères ne borne pas l'URL : « é » s'encode sur six. Sans cette
  // vérification, un message en français de longueur légale produisait un lien de
  // 10 000 caractères, que GitHub refuse d'ouvrir. On l'éprouve sur la vraie base,
  // avec le message le plus coûteux possible.
  it("reste sous la limite d'URL de GitHub, sur toute la base et en tout accents", () => {
    const message = "é".repeat(MAX_MESSAGE_LENGTH);
    for (const minister of MINISTERS) {
      const url = issueUrl(minister, message);
      expect(url.length, `fiche ${minister.id}`).toBeLessThan(8000);
      // Et le message doit passer en entier : le filet de sécurité ne doit jamais
      // avoir à rogner sur une fiche réelle, sans quoi la personne perdrait du
      // texte sans en être avertie.
      expect(url, `fiche ${minister.id}`).toContain("%C3%A9".repeat(MAX_MESSAGE_LENGTH));
    }
  });
});
