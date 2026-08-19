/**
 * Schéma de validation de `ministers.json`. Voir CLAUDE.md §4.3.
 *
 * Le JSON est éditable à la main : c'est voulu, une personne doit pouvoir corriger
 * une date sans lancer de script. Ce schéma est le filet qui empêche une faute de
 * frappe d'arriver en production — il fait échouer le build (`npm run validate`).
 */
import { z } from "zod";
import { MANDATE_RANKS, PORTFOLIO_IDS } from "../src/game/types";

const CURRENT_YEAR = 2026;

const yearSchema = z
  .number()
  .int()
  .min(1958, "La Ve République commence en 1958")
  .max(CURRENT_YEAR);

export const mandateSchema = z
  .object({
    portfolio: z.enum(PORTFOLIO_IDS),
    // Le rang décide de l'appartenance aux niveaux de difficulté : une valeur
    // erronée sortirait silencieusement la personne d'un niveau.
    rank: z.enum(MANDATE_RANKS),
    officialTitle: z.string().min(3),
    startYear: yearSchema,
    endYear: yearSchema.nullable(),
  })
  .refine((m) => m.endYear === null || m.endYear >= m.startYear, {
    message: "endYear doit être postérieure ou égale à startYear",
  });

/**
 * Le champ `Artist` de Commons n'est pas toujours un nom d'auteur : il contient
 * parfois un gabarit d'avertissement, une chaîne « original.jpg : A derivative
 * work: B », ou une consigne d'attribution en prose. Recopié tel quel, cela
 * s'affiche sur la page Crédits.
 *
 * Ces motifs signalent une valeur reprise sans relecture. Le remède est de regarder
 * aussi les champs `Attribution` et `Credit` du fichier, que `fetch-photo-metadata`
 * affiche désormais.
 */
const CREDIT_INTERDIT: readonly [RegExp, string][] = [
  [/\.jpe?g|\.png|\.webp/i, "contient un nom de fichier"],
  [/derivative work/i, "chaîne de dérivation brute : créditer les deux auteurs"],
  [/^\s*\[/, "crochets d'inventaire à retirer"],
  [/^(this file|this illustration|english\s*:)/i, "gabarit Commons, pas un auteur"],
  [/please credit this with/i, "consigne d'attribution : n'en garder que le nom"],
];

const creditSchema = z
  .string()
  .min(1, "crédit obligatoire, même pour le domaine public")
  .max(120, "crédit anormalement long : probablement du texte de gabarit")
  .superRefine((credit, ctx) => {
    for (const [motif, message] of CREDIT_INTERDIT) {
      if (motif.test(credit)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `crédit — ${message}` });
      }
    }
  });

export const ministerSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id en kebab-case, sans accent"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    aliases: z.array(z.string().min(1)),
    // `null` = non renseigné sur Wikidata. Une chaîne vide est refusée : elle
    // laisserait croire à une donnée saisie alors qu'elle est absente.
    party: z.string().min(1).nullable(),
    politicalFamily: z.enum(["gauche", "centre", "droite", "autre"]).nullable(),
    mandates: z.array(mandateSchema).min(1, "au moins un mandat"),
    photo: z.object({
      commonsFile: z.string().min(1),
      credit: creditSchema,
      license: z.string().min(1),
    }),
    sourceUrl: z.string().url(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine(
    (m) =>
      m.mandates.every(
        (mandate, i) =>
          i === 0 || mandate.startYear >= (m.mandates[i - 1]?.startYear ?? 0),
      ),
    { message: "les mandats doivent être triés par startYear croissant" },
  )
  // Une famille politique sans parti serait une déduction, pas une donnée sourcée :
  // les deux champs se remplissent ensemble ou restent tous deux à null.
  .refine((m) => m.party !== null || m.politicalFamily === null, {
    message: "politicalFamily doit être null quand party est null",
  });

export const ministersSchema = z
  .array(ministerSchema)
  .min(1)
  .refine((list) => new Set(list.map((m) => m.id)).size === list.length, {
    message: "les id doivent être uniques",
  });

export type ValidatedMinister = z.infer<typeof ministerSchema>;
