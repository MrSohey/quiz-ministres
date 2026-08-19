/**
 * Types du domaine. Voir CLAUDE.md §4.
 *
 * Règle structurante : une fiche = UNE PERSONNE, pas un mandat. Beaucoup de
 * ministres ont occupé plusieurs postes ; une fiche par mandat ferait revenir la
 * même photo avec des réponses différentes.
 */

/** Identifiant stable, en kebab-case, sans accent. */
export type MinisterId = string;

/**
 * Famille de portefeuille, stable dans le temps.
 *
 * Les intitulés officiels changent sans arrêt : le ministère de l'Économie a porté
 * une dizaine de noms depuis 1958. Le joueur répond donc sur la FAMILLE, jamais sur
 * l'intitulé exact, qui n'est affiché qu'à la révélation.
 */
export const PORTFOLIO_IDS = [
  "premier-ministre",
  "interieur",
  "affaires-etrangeres",
  "economie-finances",
  "justice",
  "defense",
  "education-nationale",
  "enseignement-superieur-recherche",
  "sante-solidarites",
  "travail-emploi",
  "culture",
  "agriculture",
  "environnement-transition-ecologique",
  "transports",
  "logement",
  "outre-mer",
  "fonction-publique",
  "sports",
  "budget",
  "industrie",
  "commerce-exterieur",
  "relations-parlement",
  "porte-parole-gouvernement",
] as const;

export type PortfolioId = (typeof PORTFOLIO_IDS)[number];

export type PoliticalFamily = "gauche" | "centre" | "droite" | "autre";

/**
 * Rang du poste. C'est ce qui sépare les niveaux de difficulté : le niveau
 * Difficile est le seul à inclure les ministres délégués et secrétaires d'État.
 */
export const MANDATE_RANKS = ["ministre", "ministre-delegue", "secretaire-etat"] as const;

export type MandateRank = (typeof MANDATE_RANKS)[number];

export interface Mandate {
  portfolio: PortfolioId;
  /**
   * Intitulé affiché à la révélation.
   *
   * Pour un ministre de plein exercice, c'est l'intitulé générique du poste
   * (`holderLabel` du portefeuille) et non l'intitulé exact de l'époque : Wikidata
   * ne fournit que le nom ACTUEL du ministère, ce qui donnerait des anachronismes
   * du type « ministre de l'Économie, des Finances et de la Souveraineté
   * industrielle et numérique » pour un mandat de 1966.
   *
   * Pour un délégué ou un secrétaire d'État, l'intitulé précis est conservé : il
   * est spécifique, récent, et sans ambiguïté.
   */
  officialTitle: string;
  rank: MandateRank;
  /** Années uniquement (pas de mois, pas de jours). */
  startYear: number;
  /** `null` si le mandat est en cours. */
  endYear: number | null;
}

export interface Photo {
  /**
   * Nom du fichier sur Wikimedia Commons, SANS le préfixe "File:".
   * On stocke le nom et non l'URL : c'est ce qui rend le lien résistant aux
   * renommages de fichiers sur Commons (CLAUDE.md §6.3).
   */
  commonsFile: string;
  credit: string;
  license: string;
}

export interface Minister {
  id: MinisterId;
  firstName: string;
  lastName: string;
  /** Formes alternatives acceptées : nom de jeune fille, particule, orthographe usuelle. */
  aliases: string[];
  /**
   * `null` quand Wikidata ne renseigne aucun parti. Ce n'est pas une lacune de la
   * base : beaucoup de ministres issus de la société civile n'ont réellement pas
   * d'étiquette. On préfère l'absence à une valeur inventée, et l'indice
   * correspondant est simplement escamoté (§7.5).
   */
  party: string | null;
  /** `null` pour la même raison que `party`. */
  politicalFamily: PoliticalFamily | null;
  /** Au moins un mandat, triés par startYear croissant. */
  mandates: Mandate[];
  photo: Photo;
  /** URL Wikipédia FR ou Wikidata, pour vérification humaine. Obligatoire. */
  sourceUrl: string;
  /** 1 = très connu, 3 = obscur. */
  difficulty: 1 | 2 | 3;
}
