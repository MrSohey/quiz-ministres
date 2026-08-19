import { describe, expect, it } from "vitest";
import {
  challengeUrl,
  decodeChallenge,
  encodeChallenge,
  type Challenge,
} from "./challenge";

const DEFI: Challenge = { level: "facile", seed: "k3m9qz", fingerprint: "1abc" };

describe("encodeChallenge / decodeChallenge", () => {
  it("fait un aller-retour sans perte", () => {
    expect(decodeChallenge(`?defi=${encodeChallenge(DEFI)}`)).toEqual(DEFI);
  });

  it("produit une valeur lisible", () => {
    expect(encodeChallenge(DEFI)).toBe("facile.k3m9qz.1abc");
  });

  it("fonctionne pour les trois niveaux", () => {
    for (const level of ["facile", "intermediaire", "difficile"] as const) {
      const defi = { ...DEFI, level };
      expect(decodeChallenge(`?defi=${encodeChallenge(defi)}`)).toEqual(defi);
    }
  });

  it("tolère les autres paramètres d'URL", () => {
    expect(decodeChallenge(`?utm_source=x&defi=${encodeChallenge(DEFI)}&y=1`)).toEqual(
      DEFI,
    );
  });
});

/**
 * Un lien de défi vient d'un tiers : il peut être tronqué par une messagerie, ou
 * bricolé à la main. Aucune de ces formes ne doit empêcher le jeu de démarrer —
 * `decodeChallenge` renvoie `null` et le joueur retombe sur le choix du niveau.
 */
describe("liens invalides", () => {
  const CAS: [string, string][] = [
    ["aucun paramètre", "?autre=1"],
    ["chaîne vide", ""],
    ["valeur vide", "?defi="],
    ["champ manquant", "?defi=facile.k3m9qz"],
    ["champ en trop", "?defi=facile.k3m9qz.1abc.zzz"],
    ["niveau inconnu", "?defi=impossible.k3m9qz.1abc"],
    ["niveau vide", "?defi=.k3m9qz.1abc"],
    ["graine en majuscules", "?defi=facile.K3M9QZ.1abc"],
    ["graine trop longue", `?defi=facile.${"a".repeat(17)}.1abc`],
    ["empreinte invalide", "?defi=facile.k3m9qz.TROP-LONGUE-ET-MAJUSCULE"],
  ];

  for (const [nom, search] of CAS) {
    it(`renvoie null : ${nom}`, () => {
      expect(decodeChallenge(search)).toBeNull();
    });
  }
});

describe("challengeUrl", () => {
  it("construit un lien absolu portant le défi", () => {
    const url = challengeUrl(DEFI, "https://mrsohey.github.io/quiz-ministres/");
    expect(url).toBe("https://mrsohey.github.io/quiz-ministres/?defi=facile.k3m9qz.1abc");
  });

  // Sinon, partager depuis une partie déjà issue d'un défi empilerait les
  // paramètres et transmettrait l'ancienne graine.
  it("repart de l'URL nue, sans les paramètres ni l'ancre courants", () => {
    const url = challengeUrl(
      DEFI,
      "https://mrsohey.github.io/quiz-ministres/?defi=difficile.vieux.9zzz#bas",
    );
    expect(url).toBe("https://mrsohey.github.io/quiz-ministres/?defi=facile.k3m9qz.1abc");
  });

  it("préserve le chemin, indispensable sur GitHub Pages", () => {
    const url = challengeUrl(DEFI, "https://exemple.fr/un/sous/dossier/");
    expect(url).toContain("/un/sous/dossier/");
  });
});
