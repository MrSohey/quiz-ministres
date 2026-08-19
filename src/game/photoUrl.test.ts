import { describe, expect, it } from "vitest";
import { photoDescriptionUrl, photoUrl } from "./photoUrl";

describe("photoUrl", () => {
  it("passe par Special:FilePath, qui survit aux renommages sur Commons", () => {
    expect(photoUrl("Michel Debré.jpg")).toContain(
      "https://commons.wikimedia.org/wiki/Special:FilePath/",
    );
  });

  // Sans width, Commons sert l'original : 862 Ko au lieu de 86 Ko sur un cas mesuré.
  it("impose toujours une largeur", () => {
    expect(photoUrl("Michel Debré.jpg")).toContain("?width=500");
    expect(photoUrl("Michel Debré.jpg", 320)).toContain("?width=320");
  });

  it("encode espaces, accents, parenthèses et apostrophes", () => {
    const url = photoUrl("Jacques Chirac (1997) (cropped).jpg");
    expect(url).toContain("Jacques%20Chirac%20(1997)%20(cropped).jpg");
    expect(photoUrl("Édith Cresson - 1995 (cropped).jpg")).toContain("%C3%89dith");
    expect(photoUrl("Alain Juppé à Québec en 2015 (cropped 2).jpg")).not.toContain(" ");
  });

  it("construit la page de description pour la page Crédits", () => {
    expect(photoDescriptionUrl("Michel Debré.jpg")).toBe(
      "https://commons.wikimedia.org/wiki/File:Michel%20Debr%C3%A9.jpg",
    );
  });
});
