/**
 * Validation de la base. Voir CLAUDE.md §9.
 *
 * Volontairement SANS accès réseau : la disponibilité réelle des photos sur Commons
 * est vérifiée par `npm run check-links`, pour que cette suite reste rapide et
 * exécutable hors ligne.
 */
import { describe, expect, it } from "vitest";
import { ministersSchema } from "../../data/ministers.schema";
import { MINISTERS } from "./ministers";
import { isNameCorrect, resolvePortfolio } from "./matching";
import { PORTFOLIO_BY_ID } from "./portfolios";
import { MANDATE_RANKS } from "./types";
import { maxHintsFor } from "./hints";

describe("ministers.json", () => {
  it("respecte le schéma", () => {
    const result = ministersSchema.safeParse(MINISTERS);
    if (!result.success) {
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("a des id uniques", () => {
    const ids = MINISTERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("déclare un portefeuille connu pour chaque mandat", () => {
    for (const minister of MINISTERS) {
      for (const mandate of minister.mandates) {
        expect(PORTFOLIO_BY_ID.has(mandate.portfolio)).toBe(true);
      }
    }
  });

  // Sans cette vérification, une fiche pourrait avoir une bonne réponse que le
  // moteur de matching est incapable de reconnaître : manche injouable.
  it("a, pour chaque mandat, un intitulé de référence que le joueur peut retrouver", () => {
    for (const minister of MINISTERS) {
      for (const mandate of minister.mandates) {
        const label = PORTFOLIO_BY_ID.get(mandate.portfolio)!.canonicalLabel;
        expect(resolvePortfolio(label)).toContain(mandate.portfolio);
      }
    }
  });

  // Un parti absent est une information exacte (ministres de la société civile) ;
  // une chaîne vide serait une saisie bâclée. Le schéma refuse la seconde.
  it("n'a jamais de parti ni de famille renseignés à vide", () => {
    for (const minister of MINISTERS) {
      expect(minister.party).not.toBe("");
      if (minister.party === null) {
        expect(minister.politicalFamily).toBeNull();
      }
    }
  });

  it("propose au moins quatre indices pour chaque fiche", () => {
    // Deux des six indices dépendent du parti. Sous quatre indices, une manche
    // deviendrait indevinable pour un joueur qui bloque.
    for (const minister of MINISTERS) {
      expect(maxHintsFor(minister)).toBeGreaterThanOrEqual(4);
    }
  });

  // Ces saisies étaient toutes refusées avant l'ajout des alias. Deux d'entre elles
  // relevaient d'un bug : le générateur avait pris la particule de « Couve de
  // Murville » et « Donnedieu de Vabres » pour le début du nom, si bien que le nom
  // usuel complet ne correspondait plus à rien.
  it.each([
    ["maurice-couve-de-murville", "Couve de Murville"],
    ["renaud-donnedieu-de-vabres", "Donnedieu de Vabres"],
    ["valery-giscard-d-estaing", "Giscard"],
    ["valery-giscard-d-estaing", "VGE"],
    ["dominique-strauss-kahn", "DSK"],
    ["michele-alliot-marie", "MAM"],
  ])("accepte « %s » sous la forme « %s »", (id, input) => {
    const minister = MINISTERS.find((m) => m.id === id);
    expect(minister, `fiche ${id} absente de la base`).toBeDefined();
    expect(isNameCorrect(input, minister!)).toBe(true);
  });

  it("n'a pas d'alias vide ni redondant avec le nom de famille", () => {
    for (const minister of MINISTERS) {
      for (const alias of minister.aliases) {
        expect(alias.trim().length).toBeGreaterThan(0);
        expect(alias.toLowerCase()).not.toBe(minister.lastName.toLowerCase());
      }
    }
  });

  it("crédite et licencie chaque photo", () => {
    for (const minister of MINISTERS) {
      expect(minister.photo.credit.trim().length).toBeGreaterThan(0);
      expect(minister.photo.license.trim().length).toBeGreaterThan(0);
    }
  });

  it("ne référence pas deux fois le même fichier Commons", () => {
    const files = MINISTERS.map((m) => m.photo.commonsFile);
    expect(new Set(files).size).toBe(files.length);
  });

  it("contient assez de fiches pour une partie complète", () => {
    expect(MINISTERS.length).toBeGreaterThanOrEqual(10);
  });

  // Le rang décide de l'appartenance aux niveaux : une valeur absente sortirait
  // silencieusement la personne du vivier.
  it("déclare un rang pour chaque mandat", () => {
    for (const minister of MINISTERS) {
      for (const mandate of minister.mandates) {
        expect(MANDATE_RANKS).toContain(mandate.rank);
      }
    }
  });

  it("respecte la borne de 1958 et n'anticipe pas sur l'avenir", () => {
    for (const minister of MINISTERS) {
      for (const mandate of minister.mandates) {
        expect(mandate.startYear).toBeGreaterThanOrEqual(1958);
        if (mandate.endYear !== null) {
          expect(mandate.endYear).toBeGreaterThanOrEqual(mandate.startYear);
        }
      }
    }
  });

  it("n'affiche pas d'intitulé anachronique pour un ministre de plein exercice", () => {
    // Wikidata renvoie le nom ACTUEL du ministère : « ministre de l'Économie, des
    // Finances et de la Souveraineté industrielle et numérique » pour un mandat de
    // 1966. Les mandats de plein exercice doivent donc porter le `holderLabel`.
    for (const minister of MINISTERS) {
      for (const mandate of minister.mandates) {
        if (mandate.rank !== "ministre") continue;
        expect(mandate.officialTitle).toBe(
          PORTFOLIO_BY_ID.get(mandate.portfolio)!.holderLabel,
        );
      }
    }
  });
});
