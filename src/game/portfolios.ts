/**
 * Table des appellations acceptées pour chaque ministère. Voir CLAUDE.md §7.4.
 *
 * Cette table vit dans le code et non dans `ministers.json` : elle décrit un
 * portefeuille, pas une personne.
 *
 * Deux règles à ne pas perdre de vue en l'étendant :
 *  - les SIGLES sont séparés des alias, car ils sont comparés en égalité stricte.
 *    Sur trois lettres, une tolérance d'un caractère rendrait `mae` (affaires
 *    étrangères), `maa` (agriculture) et `men` (éducation) équivalents ;
 *  - `portfolios.test.ts` vérifie qu'aucune appellation ne résout vers deux
 *    portefeuilles. Ajouter un alias ambigu fait échouer les tests.
 */
import { PORTFOLIO_IDS, type PortfolioId } from "./types";

export interface Portfolio {
  id: PortfolioId;
  /** Intitulé de référence, affiché dans les suggestions. */
  canonicalLabel: string;
  /**
   * Intitulé du titulaire, utilisé comme `officialTitle` des mandats de plein
   * exercice. « Ministère de l'Intérieur » nomme l'institution, « Ministre de
   * l'Intérieur » nomme la personne : c'est la seconde forme qu'on affiche.
   */
  holderLabel: string;
  /** Intitulés historiques, formes courtes, métonymies. Tolérants aux fautes. */
  aliases: string[];
  /** Sigles. Correspondance EXACTE uniquement. */
  acronyms: string[];
}

export const PORTFOLIOS: readonly Portfolio[] = [
  {
    id: "premier-ministre",
    canonicalLabel: "Premier ministre",
    holderLabel: "Premier ministre",
    aliases: [
      "premier ministre",
      "première ministre",
      "cheffe du gouvernement",
      "chef du gouvernement",
      "matignon",
      "président du conseil",
    ],
    acronyms: ["pm"],
  },
  {
    id: "interieur",
    canonicalLabel: "Ministère de l'Intérieur",
    holderLabel: "Ministre de l'Intérieur",
    aliases: ["intérieur", "intérieur et outre-mer", "place beauvau", "beauvau"],
    acronyms: [],
  },
  {
    id: "affaires-etrangeres",
    canonicalLabel: "Ministère de l'Europe et des Affaires étrangères",
    holderLabel: "Ministre des Affaires étrangères",
    aliases: [
      "affaires étrangères",
      "europe et affaires étrangères",
      "affaires étrangères et européennes",
      "affaires étrangères et développement international",
      "relations extérieures",
      "quai d'orsay",
      "diplomatie",
    ],
    acronyms: ["mae", "meae", "maee", "maedi"],
  },
  {
    id: "economie-finances",
    canonicalLabel: "Ministère de l'Économie et des Finances",
    holderLabel: "Ministre de l'Économie et des Finances",
    aliases: [
      "économie",
      "économie et finances",
      "finances",
      "économie des finances et de la souveraineté industrielle et numérique",
      "économie et des finances et de la relance",
      "bercy",
    ],
    acronyms: [],
  },
  {
    id: "justice",
    canonicalLabel: "Ministère de la Justice",
    holderLabel: "Garde des Sceaux, ministre de la Justice",
    aliases: ["justice", "garde des sceaux", "place vendôme"],
    acronyms: [],
  },
  {
    id: "defense",
    canonicalLabel: "Ministère des Armées",
    holderLabel: "Ministre des Armées",
    aliases: ["armées", "défense", "défense nationale", "hôtel de brienne"],
    acronyms: [],
  },
  {
    id: "education-nationale",
    canonicalLabel: "Ministère de l'Éducation nationale",
    holderLabel: "Ministre de l'Éducation nationale",
    aliases: [
      "éducation nationale",
      "éducation",
      "instruction publique",
      "rue de grenelle",
    ],
    acronyms: ["men"],
  },
  {
    id: "enseignement-superieur-recherche",
    canonicalLabel: "Ministère de l'Enseignement supérieur et de la Recherche",
    holderLabel: "Ministre de l'Enseignement supérieur et de la Recherche",
    aliases: [
      "enseignement supérieur",
      "enseignement supérieur et recherche",
      "recherche",
      "universités",
    ],
    acronyms: ["mesr"],
  },
  {
    id: "sante-solidarites",
    canonicalLabel: "Ministère de la Santé et des Solidarités",
    holderLabel: "Ministre de la Santé et des Solidarités",
    aliases: [
      "santé",
      "santé et solidarités",
      "solidarités",
      "affaires sociales",
      "ségur",
    ],
    acronyms: [],
  },
  {
    id: "travail-emploi",
    canonicalLabel: "Ministère du Travail et de l'Emploi",
    holderLabel: "Ministre du Travail et de l'Emploi",
    aliases: ["travail", "travail et emploi", "emploi"],
    acronyms: [],
  },
  {
    id: "culture",
    canonicalLabel: "Ministère de la Culture",
    holderLabel: "Ministre de la Culture",
    aliases: [
      "culture",
      "culture et communication",
      "affaires culturelles",
      "rue de valois",
    ],
    acronyms: [],
  },
  {
    id: "agriculture",
    canonicalLabel: "Ministère de l'Agriculture",
    holderLabel: "Ministre de l'Agriculture",
    aliases: [
      "agriculture",
      "agriculture et souveraineté alimentaire",
      "agriculture et développement rural",
      "agriculture et pêche",
      "rue de varenne",
    ],
    acronyms: [],
  },
  {
    id: "environnement-transition-ecologique",
    canonicalLabel: "Ministère de la Transition écologique",
    holderLabel: "Ministre de la Transition écologique",
    aliases: [
      "transition écologique",
      "transition écologique et solidaire",
      "environnement",
      "écologie",
      "développement durable",
    ],
    acronyms: [],
  },
  {
    id: "transports",
    canonicalLabel: "Ministère des Transports",
    holderLabel: "Ministre des Transports",
    aliases: ["transports", "équipement", "équipement et transports"],
    acronyms: [],
  },
  {
    id: "logement",
    canonicalLabel: "Ministère du Logement",
    holderLabel: "Ministre du Logement",
    aliases: ["logement", "logement et ville", "ville"],
    acronyms: [],
  },
  {
    id: "outre-mer",
    canonicalLabel: "Ministère des Outre-mer",
    holderLabel: "Ministre des Outre-mer",
    aliases: ["outre-mer", "départements et territoires d'outre-mer", "rue oudinot"],
    acronyms: ["dom tom"],
  },
  {
    id: "fonction-publique",
    canonicalLabel: "Ministère de la Fonction publique",
    holderLabel: "Ministre de la Fonction publique",
    aliases: ["fonction publique", "réforme de l'état"],
    acronyms: [],
  },
  {
    id: "sports",
    canonicalLabel: "Ministère des Sports",
    holderLabel: "Ministre des Sports",
    aliases: ["sports", "jeunesse et sports", "jeunesse"],
    acronyms: [],
  },
  {
    id: "budget",
    canonicalLabel: "Ministère du Budget",
    holderLabel: "Ministre du Budget",
    aliases: ["budget", "comptes publics", "budget et comptes publics"],
    acronyms: [],
  },
  {
    id: "industrie",
    canonicalLabel: "Ministère de l'Industrie",
    holderLabel: "Ministre de l'Industrie",
    aliases: ["industrie", "redressement productif"],
    acronyms: [],
  },
  {
    id: "commerce-exterieur",
    canonicalLabel: "Ministère du Commerce extérieur",
    holderLabel: "Ministre du Commerce extérieur",
    aliases: ["commerce extérieur", "commerce"],
    acronyms: [],
  },
  {
    id: "relations-parlement",
    canonicalLabel: "Ministère des Relations avec le Parlement",
    holderLabel: "Ministre des Relations avec le Parlement",
    aliases: ["relations avec le parlement", "parlement"],
    acronyms: [],
  },
  {
    id: "porte-parole-gouvernement",
    canonicalLabel: "Porte-parole du Gouvernement",
    holderLabel: "Porte-parole du Gouvernement",
    aliases: ["porte-parole du gouvernement", "porte-parole"],
    acronyms: [],
  },
];

/** Accès direct par id, construit une fois au chargement du module. */
export const PORTFOLIO_BY_ID: ReadonlyMap<PortfolioId, Portfolio> = new Map(
  PORTFOLIOS.map((p) => [p.id, p]),
);

// Garde-fou : un portefeuille déclaré dans les types mais absent de la table
// donnerait un ministère impossible à deviner. On préfère échouer au chargement.
for (const id of PORTFOLIO_IDS) {
  if (!PORTFOLIO_BY_ID.has(id)) {
    throw new Error(`Portefeuille "${id}" absent de PORTFOLIOS`);
  }
}
