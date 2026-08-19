import { describe, expect, it } from "vitest";
import { ROUNDS_PER_GAME } from "./config";
import { MAX_HINTS } from "./hints";
import {
  gameReducer,
  initialState,
  isRoundOver,
  roundStatus,
  type GameState,
} from "./reducer";
import type { Minister } from "./types";

const constantRng = () => 0.5;

function makeMinister(id: string, lastName: string): Minister {
  return {
    id,
    firstName: "Jean",
    lastName,
    aliases: [],
    party: "PS",
    politicalFamily: "gauche",
    mandates: [
      {
        portfolio: "agriculture",
        rank: "ministre",
        officialTitle: "Ministre de l'Agriculture",
        startYear: 1981,
        endYear: 1983,
      },
    ],
    photo: { commonsFile: `${id}.jpg`, credit: "c", license: "l" },
    sourceUrl: "https://example.org",
    difficulty: 1,
  };
}

// Douze personnes : assez pour qu'une partie de 10 manches ne recycle personne.
const NAMES = [
  "Cresson",
  "Rocard",
  "Jospin",
  "Chirac",
  "Fabius",
  "Juppe",
  "Barre",
  "Pompidou",
  "Debre",
  "Borne",
  "Valls",
  "Attal",
];
const MINISTERS = NAMES.map((name, i) => makeMinister(`p${i}`, name));

function started(): GameState {
  return gameReducer(initialState(MINISTERS), {
    type: "start",
    level: "intermediaire",
    rng: constantRng,
  });
}

/** Répond correctement aux deux champs de la manche courante. */
function solveRound(state: GameState): GameState {
  const minister = state.round?.minister;
  if (!minister) throw new Error("pas de manche en cours");
  let next = gameReducer(state, {
    type: "submit",
    field: "name",
    value: minister.lastName,
  });
  next = gameReducer(next, { type: "submit", field: "portfolio", value: "agriculture" });
  return next;
}

describe("start", () => {
  it("passe en jeu et distribue une première manche", () => {
    const state = started();
    expect(state.status).toBe("playing");
    expect(state.round?.index).toBe(0);
    expect(state.score).toBe(0);
    expect(roundStatus(state.round!)).toBe("asking");
  });

  it("ne démarre pas sur une base vide", () => {
    const empty = initialState([]);
    expect(
      gameReducer(empty, { type: "start", level: "intermediaire", rng: constantRng })
        .status,
    ).toBe("idle");
  });
});

describe("submit", () => {
  it("verrouille chaque champ indépendamment", () => {
    let state = started();
    const name = state.round!.minister.lastName;

    state = gameReducer(state, { type: "submit", field: "name", value: name });
    expect(roundStatus(state.round!)).toBe("nameFound");
    expect(isRoundOver(state.round!)).toBe(false);

    state = gameReducer(state, {
      type: "submit",
      field: "portfolio",
      value: "agriculture",
    });
    expect(roundStatus(state.round!)).toBe("solved");
    expect(isRoundOver(state.round!)).toBe(true);
  });

  it("mémorise une réponse fausse pour le retour visuel", () => {
    let state = started();
    state = gameReducer(state, { type: "submit", field: "name", value: "Pompidou" });
    expect(state.round?.lastRejected).toEqual({ field: "name", value: "Pompidou" });
    expect(state.round?.nameFound).toBe(false);

    state = gameReducer(state, { type: "dismissRejection" });
    expect(state.round?.lastRejected).toBeNull();
  });

  it("ignore une soumission sur un champ déjà trouvé", () => {
    let state = started();
    const name = state.round!.minister.lastName;
    state = gameReducer(state, { type: "submit", field: "name", value: name });
    const after = gameReducer(state, {
      type: "submit",
      field: "name",
      value: "n'importe quoi",
    });
    expect(after).toBe(state);
  });

  it("ignore une soumission sur une manche terminée", () => {
    const solved = solveRound(started());
    const after = gameReducer(solved, { type: "submit", field: "name", value: "x" });
    expect(after).toBe(solved);
  });
});

describe("indices", () => {
  it("s'épuisent après le dernier", () => {
    let state = started();
    for (let i = 0; i < MAX_HINTS; i++) {
      state = gameReducer(state, { type: "requestHint" });
    }
    expect(state.round?.hintsUsed).toBe(MAX_HINTS);
    const after = gameReducer(state, { type: "requestHint" });
    expect(after).toBe(state);
  });

  it("réduisent le score de la manche", () => {
    let state = started();
    state = gameReducer(state, { type: "requestHint" });
    state = gameReducer(state, { type: "requestHint" });
    state = solveRound(state);
    expect(state.score).toBe(80); // 100 − 2 × 10
  });
});

describe("reveal", () => {
  it("clôt la manche à zéro point et casse la série", () => {
    const state = gameReducer(started(), { type: "reveal" });
    expect(roundStatus(state.round!)).toBe("revealed");
    expect(state.round?.points).toBe(0);
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
  });

  it("conserve les points d'un champ trouvé avant abandon", () => {
    let state = started();
    state = gameReducer(state, {
      type: "submit",
      field: "name",
      value: state.round!.minister.lastName,
    });
    state = gameReducer(state, { type: "reveal" });
    expect(state.score).toBe(50);
  });
});

describe("bonus de série", () => {
  it("ne se déclenche qu'à partir de la troisième manche parfaite", () => {
    let state = started();
    const scores: number[] = [];
    for (let i = 0; i < 4; i++) {
      state = solveRound(state);
      scores.push(state.score);
      state = gameReducer(state, { type: "nextRound", rng: constantRng });
    }
    // 100, 200, puis 300 + 25, puis 425 + 25
    expect(scores).toEqual([100, 200, 325, 450]);
  });

  it("est remis à zéro par un indice", () => {
    let state = started();
    state = solveRound(state);
    state = gameReducer(state, { type: "nextRound", rng: constantRng });
    state = solveRound(state);
    state = gameReducer(state, { type: "nextRound", rng: constantRng });
    state = gameReducer(state, { type: "requestHint" });
    state = solveRound(state);
    expect(state.streak).toBe(0);
    expect(state.score).toBe(290); // 100 + 100 + (100 − 10), sans bonus
  });
});

describe("déroulé de la partie", () => {
  it("enchaîne les manches et se termine après ROUNDS_PER_GAME", () => {
    let state = started();
    for (let i = 0; i < ROUNDS_PER_GAME; i++) {
      expect(state.status).toBe("playing");
      state = solveRound(state);
      state = gameReducer(state, { type: "nextRound", rng: constantRng });
    }
    expect(state.status).toBe("finished");
    expect(state.round).toBeNull();
    expect(state.history).toHaveLength(ROUNDS_PER_GAME);
  });

  it("refuse de passer à la manche suivante avant la fin de la courante", () => {
    const state = started();
    expect(gameReducer(state, { type: "nextRound", rng: constantRng })).toBe(state);
  });

  // Sans ce plafond, une partie de 10 manches sur un vivier de 3 personnes
  // recyclerait le sac et montrerait deux fois la même photo.
  it("plafonne le nombre de manches à la taille du vivier", () => {
    const small = [makeMinister("a", "Cresson"), makeMinister("b", "Rocard")];
    let state = gameReducer(initialState(small), {
      type: "start",
      level: "intermediaire",
      rng: constantRng,
    });
    expect(state.roundsInGame).toBe(2);

    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      seen.push(state.round!.minister.id);
      state = solveRound(state);
      state = gameReducer(state, { type: "nextRound", rng: constantRng });
    }
    expect(state.status).toBe("finished");
    expect(new Set(seen).size).toBe(2);
  });
});

describe("niveaux", () => {
  it("restreint le vivier au niveau choisi", () => {
    const delegate = makeMinister("delegue", "Beaune");
    delegate.mandates = [
      {
        portfolio: "affaires-etrangeres",
        rank: "ministre-delegue",
        officialTitle: "Ministre délégué chargé de l'Europe",
        startYear: 2020,
        endYear: 2022,
      },
    ];
    const base = [...MINISTERS, delegate];

    const easy = gameReducer(initialState(base), {
      type: "start",
      level: "facile",
      rng: constantRng,
    });
    const hard = gameReducer(initialState(base), {
      type: "start",
      level: "difficile",
      rng: constantRng,
    });

    // Agriculture n'est pas régalien : personne n'entre en Facile.
    expect(easy.status).toBe("idle");
    // Le ministre délégué n'existe qu'au niveau Difficile.
    expect(hard.pool.map((m) => m.id)).toContain("delegue");
    expect(hard.pool).toHaveLength(base.length);
  });

  it("mémorise le niveau de la partie et le remet à zéro", () => {
    const state = started();
    expect(state.level).toBe("intermediaire");
    const reset = gameReducer(state, { type: "reset" });
    expect(reset.status).toBe("idle");
    expect(reset.level).toBeNull();
    expect(reset.pool).toHaveLength(0);
  });
});

describe("photo indisponible", () => {
  it("remplace la personne sans changer le numéro de manche", () => {
    const state = started();
    const before = state.round!.minister.id;
    const after = gameReducer(state, { type: "skipUnavailablePhoto", rng: constantRng });
    expect(after.round?.index).toBe(state.round!.index);
    expect(after.round?.minister.id).not.toBe(before);
  });

  it("ne remplace pas une manche déjà terminée", () => {
    const solved = solveRound(started());
    expect(gameReducer(solved, { type: "skipUnavailablePhoto", rng: constantRng })).toBe(
      solved,
    );
  });
});
