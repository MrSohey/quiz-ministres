import { describe, expect, it } from "vitest";
import { continuesStreak, scoreRound, streakBonus } from "./scoring";

describe("scoreRound", () => {
  it("attribue 50 points par champ trouvé", () => {
    expect(scoreRound({ nameFound: true, portfolioFound: true, hintsUsed: 0 })).toBe(100);
    expect(scoreRound({ nameFound: true, portfolioFound: false, hintsUsed: 0 })).toBe(50);
    expect(scoreRound({ nameFound: false, portfolioFound: true, hintsUsed: 0 })).toBe(50);
  });

  it("retire 10 points par indice", () => {
    expect(scoreRound({ nameFound: true, portfolioFound: true, hintsUsed: 3 })).toBe(70);
  });

  it("ne descend jamais sous zéro", () => {
    expect(scoreRound({ nameFound: true, portfolioFound: false, hintsUsed: 6 })).toBe(0);
  });

  it("donne zéro pour une manche révélée sans réponse", () => {
    expect(scoreRound({ nameFound: false, portfolioFound: false, hintsUsed: 0 })).toBe(0);
    expect(scoreRound({ nameFound: false, portfolioFound: false, hintsUsed: 6 })).toBe(0);
  });
});

describe("continuesStreak", () => {
  it("exige une manche parfaite et sans indice", () => {
    expect(continuesStreak({ nameFound: true, portfolioFound: true, hintsUsed: 0 })).toBe(
      true,
    );
    expect(continuesStreak({ nameFound: true, portfolioFound: true, hintsUsed: 1 })).toBe(
      false,
    );
    expect(
      continuesStreak({ nameFound: true, portfolioFound: false, hintsUsed: 0 }),
    ).toBe(false);
  });
});

describe("streakBonus", () => {
  it("ne démarre qu'au-delà du seuil de deux manches", () => {
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(2)).toBe(0);
    expect(streakBonus(3)).toBe(25);
    expect(streakBonus(9)).toBe(25);
  });
});
