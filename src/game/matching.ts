/**
 * Comparaison des réponses du joueur. Voir CLAUDE.md §7.4.
 *
 * Principe directeur : être généreux. Un joueur qui écrit « chirac », « Jaques
 * Chirac » ou « mae » a trouvé. Mais la générosité s'arrête là où elle validerait
 * une réponse fausse — d'où les deux garde-fous que sont l'égalité stricte sur les
 * sigles et l'exigence d'un mot discriminant.
 */
import { PORTFOLIOS } from "./portfolios";
import type { Minister, PortfolioId } from "./types";

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Minuscules, sans accent, sans ponctuation, espaces compressés.
 * Appliquée aux deux côtés de toute comparaison.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, " ") // tirets, apostrophes droites et typographiques, ponctuation
    .trim()
    .replace(/\s+/g, " ");
}

/** Particules facultatives des deux côtés : « de Villepin » ≡ « Villepin ». */
const NAME_PARTICLES = new Set(["de", "du", "des", "d", "le", "la", "van", "von"]);

function stripParticles(tokens: string[]): string[] {
  const kept = tokens.filter((t) => !NAME_PARTICLES.has(t));
  // Un nom entièrement composé de particules ne doit pas devenir une chaîne vide.
  return kept.length > 0 ? kept : tokens;
}

// ---------------------------------------------------------------------------
// Distance de Levenshtein
// ---------------------------------------------------------------------------

/** Distance d'édition classique, en O(n·m) temps et O(m) mémoire. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;
      current[j] = Math.min(substitution, deletion, insertion);
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length] ?? 0;
}

/**
 * Tolérance en fonction de la longueur de la chaîne de référence.
 * Court = strict : sur 5 caractères, une tolérance de 1 suffirait à confondre
 * « Debré » et « Debray », ou « Barre » et « Barrot ».
 */
export function toleranceFor(reference: string): number {
  if (reference.length <= 5) return 0;
  if (reference.length <= 9) return 1;
  return 2;
}

function isCloseEnough(input: string, reference: string): boolean {
  return levenshtein(input, reference) <= toleranceFor(reference);
}

// ---------------------------------------------------------------------------
// Acceptation du nom
// ---------------------------------------------------------------------------

/** Toutes les formes acceptables du nom d'une personne, normalisées. */
function nameCandidates(minister: Minister): string[] {
  const { firstName, lastName, aliases } = minister;
  const forms = [
    `${firstName} ${lastName}`,
    lastName,
    `${lastName} ${firstName}`,
    ...aliases,
  ];
  return forms.map((form) => stripParticles(normalize(form).split(" ")).join(" "));
}

export function isNameCorrect(input: string, minister: Minister): boolean {
  const answer = stripParticles(normalize(input).split(" ")).join(" ");
  if (answer.length === 0) return false;

  const candidates = nameCandidates(minister);
  if (candidates.includes(answer)) return true;
  return candidates.some((candidate) => isCloseEnough(answer, candidate));
}

// ---------------------------------------------------------------------------
// Acceptation du ministère
// ---------------------------------------------------------------------------

/**
 * Mots vides du domaine, retirés partout et non seulement en tête : « ministère de
 * l'Europe ET DES Affaires étrangères » doit se réduire au même jeu de mots que
 * « Europe Affaires étrangères ».
 */
// Une liste de mots vides se lit en bloc, pas à raison d'un mot par ligne.
// La directive doit être seule sur sa ligne : Prettier l'ignore sinon.
// prettier-ignore
const PORTFOLIO_STOP_WORDS = new Set([
  "ministere", "ministre", "secretariat", "etat", "haut", "haute",
  "delegue", "deleguee", "charge", "chargee",
  "de", "du", "des", "d", "la", "le", "les", "l", "a", "au", "aux", "et", "en",
]);

function portfolioTokens(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((token) => token.length > 0 && !PORTFOLIO_STOP_WORDS.has(token));
}

function portfolioKey(input: string): string {
  return portfolioTokens(input).join(" ");
}

/** Toutes les appellations complètes d'un portefeuille (hors sigles). */
function labelsOf(portfolio: (typeof PORTFOLIOS)[number]): string[] {
  return [portfolio.canonicalLabel, ...portfolio.aliases];
}

/**
 * Mots n'apparaissant que dans les appellations d'un seul portefeuille.
 *
 * Dérivé de la table au chargement du module, jamais écrit à la main : ajouter un
 * alias met la liste à jour tout seul. Sans cette notion, « affaires » seul
 * validerait indifféremment les affaires étrangères, sociales et culturelles.
 */
const DISCRIMINATING_WORDS: ReadonlySet<string> = (() => {
  const owners = new Map<string, Set<PortfolioId>>();
  for (const portfolio of PORTFOLIOS) {
    for (const label of labelsOf(portfolio)) {
      for (const token of portfolioTokens(label)) {
        let set = owners.get(token);
        if (!set) owners.set(token, (set = new Set()));
        set.add(portfolio.id);
      }
    }
  }
  const discriminating = new Set<string>();
  for (const [token, ids] of owners) {
    if (ids.size === 1) discriminating.add(token);
  }
  return discriminating;
})();

/** Exposé pour les tests et le débogage de la table. */
export function isDiscriminatingWord(word: string): boolean {
  return DISCRIMINATING_WORDS.has(normalize(word));
}

/** Une saisie courte et sans espace est traitée comme un sigle. */
function looksLikeAcronym(normalized: string): boolean {
  return normalized.length > 0 && normalized.length <= 5 && !normalized.includes(" ");
}

/**
 * Résout une saisie libre vers les portefeuilles compatibles.
 *
 * Renvoie souvent un seul id, parfois plusieurs quand la saisie est ambiguë, et un
 * tableau vide si rien ne correspond. Les étapes sont ordonnées du plus strict au
 * plus permissif et on s'arrête à la première qui donne un résultat.
 */
export function resolvePortfolio(input: string): PortfolioId[] {
  const normalized = normalize(input);
  if (normalized.length === 0) return [];

  // 1. Sigles, en égalité stricte.
  const byAcronym = PORTFOLIOS.filter((p) =>
    p.acronyms.some((acronym) => normalize(acronym) === normalized),
  );
  if (byAcronym.length > 0) return byAcronym.map((p) => p.id);

  const key = portfolioKey(input);
  if (key.length === 0) return []; // saisie faite uniquement de mots vides

  // 2. Égalité avec un intitulé, mots vides retirés.
  //
  // Cette étape passe AVANT le rejet des sigles inconnus : « santé », « ville » et
  // « bercy » font cinq lettres sans espace et seraient sinon pris pour des sigles.
  const byLabel = PORTFOLIOS.filter((p) =>
    labelsOf(p).some((label) => portfolioKey(label) === key),
  );
  if (byLabel.length > 0) return byLabel.map((p) => p.id);

  // 3. Sigle inconnu : terminal. Sur trois ou quatre lettres, une tolérance d'un
  // caractère rendrait `mae`, `maa` et `men` équivalents — on ne devine pas.
  if (looksLikeAcronym(normalized)) return [];

  // 4. Inclusion de mots, à condition d'en avoir un discriminant.
  const answerTokens = portfolioTokens(input);
  if (answerTokens.some((token) => DISCRIMINATING_WORDS.has(token))) {
    const bySubset = PORTFOLIOS.filter((p) =>
      labelsOf(p).some((label) => {
        const labelTokens = new Set(portfolioTokens(label));
        return answerTokens.every((token) => labelTokens.has(token));
      }),
    );
    if (bySubset.length > 0) return bySubset.map((p) => p.id);
  }

  // 5. Tolérance aux fautes, en dernier recours.
  const byFuzzy = PORTFOLIOS.filter((p) =>
    labelsOf(p).some((label) => isCloseEnough(key, portfolioKey(label))),
  );
  return byFuzzy.map((p) => p.id);
}

/**
 * La réponse est correcte si l'un des portefeuilles résolus figure parmi les
 * mandats. Une saisie ambiguë est donc tranchée en faveur du joueur : c'est
 * délibéré, le but est de valider quelqu'un qui a reconnu la personne.
 */
export function isPortfolioCorrect(input: string, minister: Minister): boolean {
  const resolved = resolvePortfolio(input);
  if (resolved.length === 0) return false;
  const held = new Set(minister.mandates.map((m) => m.portfolio));
  return resolved.some((id) => held.has(id));
}
