import { describe, expect, it } from "vitest";
import { availableHints, hasMoreHints, hintsFor, MAX_HINTS, maxHintsFor } from "./hints";
import type { Minister } from "./types";

const borne: Minister = {
  id: "elisabeth-borne",
  firstName: "Élisabeth",
  lastName: "Borne",
  aliases: [],
  party: "Renaissance",
  politicalFamily: "centre",
  mandates: [
    {
      portfolio: "transports",
      rank: "ministre",
      officialTitle: "Ministre chargée des Transports",
      startYear: 2017,
      endYear: 2019,
    },
    {
      portfolio: "travail-emploi",
      rank: "ministre",
      officialTitle: "Ministre du Travail",
      startYear: 2020,
      endYear: 2022,
    },
    {
      portfolio: "premier-ministre",
      rank: "ministre",
      officialTitle: "Première ministre",
      startYear: 2022,
      endYear: 2024,
    },
  ],
  photo: { commonsFile: "x.jpg", credit: "c", license: "l" },
  sourceUrl: "https://example.org",
  difficulty: 1,
};

/** Ministre issu de la société civile : ni parti ni famille politique. */
const sansParti: Minister = {
  id: "eric-dupond-moretti",
  firstName: "Éric",
  lastName: "Dupond-Moretti",
  aliases: [],
  party: null,
  politicalFamily: null,
  mandates: [
    {
      portfolio: "justice",
      rank: "ministre",
      officialTitle: "Garde des Sceaux, ministre de la Justice",
      startYear: 2020,
      endYear: 2024,
    },
  ],
  photo: { commonsFile: "y.jpg", credit: "c", license: "l" },
  sourceUrl: "https://example.org",
  difficulty: 1,
};

describe("hintsFor", () => {
  it("renvoie les indices dans l'ordre, du plus vague au plus révélateur", () => {
    expect(hintsFor(borne, 0)).toEqual([]);
    expect(hintsFor(borne, 1)[0]).toContain("années 2010");
    expect(hintsFor(borne, 2)[1]).toContain("centre");
    expect(hintsFor(borne, 3)[2]).toContain("3 mandats");
    expect(hintsFor(borne, 4)[3]).toContain("É. B.");
    expect(hintsFor(borne, 5)[4]).toContain("Renaissance");
  });

  it("borne le nombre d'indices demandés", () => {
    expect(hintsFor(borne, 99)).toHaveLength(MAX_HINTS);
    expect(hintsFor(borne, -3)).toEqual([]);
  });

  // Le dernier indice ne doit surtout pas nommer le ministère : ce serait donner
  // l'une des deux réponses attendues.
  it("ne divulgue jamais un ministère", () => {
    const all = hintsFor(borne, MAX_HINTS).join(" ").toLowerCase();
    expect(all).not.toContain("transports");
    expect(all).not.toContain("travail");
    expect(all).not.toContain("première ministre");
  });

  it("ne divulgue jamais le nom en entier", () => {
    const all = hintsFor(borne, MAX_HINTS).join(" ").toLowerCase();
    expect(all).not.toContain("borne");
    expect(all).not.toContain("élisabeth");
  });

  it("compte 5 lettres pour « Borne »", () => {
    expect(hintsFor(borne, 4)[3]).toContain("5 lettres");
  });
});

describe("hasMoreHints", () => {
  it("s'épuise après le dernier indice", () => {
    expect(hasMoreHints(borne, 0)).toBe(true);
    expect(hasMoreHints(borne, MAX_HINTS - 1)).toBe(true);
    expect(hasMoreHints(borne, MAX_HINTS)).toBe(false);
  });

  it("s'épuise plus tôt quand des indices manquent", () => {
    expect(hasMoreHints(sansParti, 4)).toBe(false);
  });
});

/**
 * Beaucoup de ministres issus de la société civile n'ont réellement pas d'étiquette.
 * Deux des six indices n'ont alors rien à dire : ils sont escamotés plutôt que
 * facturés 10 points pour zéro information.
 */
describe("fiche sans parti connu", () => {
  it("propose quatre indices au lieu de six", () => {
    expect(maxHintsFor(borne)).toBe(6);
    expect(maxHintsFor(sansParti)).toBe(4);
  });

  it("n'affiche jamais un parti ou une famille inconnus", () => {
    const all = availableHints(sansParti).join(" ").toLowerCase();
    // « nom de famille en N lettres » est un indice légitime : on cible les
    // libellés des deux indices escamotés, pas le mot « famille » isolé.
    expect(all).not.toContain("parti politique");
    expect(all).not.toContain("famille politique");
    expect(all).not.toContain("null");
    expect(all).not.toContain("undefined");
  });

  it("conserve l'ordre des indices restants", () => {
    const hints = availableHints(sansParti);
    expect(hints[0]).toContain("années 2020");
    expect(hints[1]).toContain("1 mandat");
    expect(hints[2]).toContain("É. D.");
    expect(hints[3]).toContain("2020");
  });

  it("borne hintsFor sur les indices réellement disponibles", () => {
    expect(hintsFor(sansParti, 99)).toHaveLength(4);
  });
});
