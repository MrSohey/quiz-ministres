/**
 * Lien vers une issue GitHub pré-remplie, pour signaler une erreur de fiche.
 *
 * Le jeu n'a pas de backend (CLAUDE.md §1) : il ne peut donc ni recevoir ni stocker
 * un signalement. On délègue à GitHub, qui authentifie déjà la personne, horodate
 * le message et le range à côté du code. Aucune donnée ne transite par un tiers :
 * le lien s'ouvre dans un onglet, et rien n'est envoyé tant qu'il n'est pas validé.
 *
 * Les données du jeu venant de Wikidata et de Wikipédia, un signalement porte
 * presque toujours sur une fiche précise : on l'y attache d'office plutôt que de
 * demander à la personne de recopier ce qu'elle voit à l'écran.
 */
import type { Mandate, Minister } from "./types";

const REPOSITORY = "MrSohey/quiz-ministres";

/**
 * Au-delà d'environ 8 ko d'URL, GitHub renvoie une erreur au lieu du formulaire.
 * On vise nettement en dessous, la fiche occupant déjà une part du corps.
 */
const MAX_URL_LENGTH = 6000;

/**
 * Borne du texte libre, en caractères saisis.
 *
 * Attention au piège : borner les CARACTÈRES ne borne pas l'URL. Un caractère
 * accentué s'encode sur six (`%C3%A9`), si bien que 1500 caractères d'un message
 * en français produisaient un lien de 10 000 caractères — refusé par GitHub.
 * 750 caractères tiennent sous la limite même s'ils sont tous accentués.
 */
export const MAX_MESSAGE_LENGTH = 750;

function formatMandate(mandate: Mandate): string {
  const end = mandate.endYear ?? "en cours";
  return `  - ${mandate.officialTitle} (${mandate.startYear}–${end}) — ${mandate.rank}`;
}

/**
 * Corps de l'issue, en Markdown.
 *
 * L'identifiant vient en premier et entre accents graves : c'est la seule clé qui
 * permette de retrouver la fiche dans `ministers.json`, et il doit rester
 * copiable-collable tel quel.
 */
export function issueBody(minister: Minister, message: string): string {
  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  return [
    "### Signalement",
    "",
    trimmed || "_(aucune précision donnée)_",
    "",
    "### Fiche concernée",
    "",
    `- Identifiant : \`${minister.id}\``,
    `- Nom : ${minister.firstName} ${minister.lastName}`,
    `- Parti : ${minister.party ?? "non renseigné"}`,
    `- Photo : \`${minister.photo.commonsFile}\``,
    `- Source : ${minister.sourceUrl}`,
    "- Mandats :",
    ...minister.mandates.map(formatMandate),
    "",
    "_Signalement envoyé depuis le jeu._",
  ].join("\n");
}

export function issueTitle(minister: Minister): string {
  return `Erreur signalée sur la fiche ${minister.id}`;
}

function build(minister: Minister, message: string): string {
  // URLSearchParams encode tout ce qui doit l'être : accents, sauts de ligne,
  // apostrophes. Concaténer à la main casserait les corps multi-lignes.
  const params = new URLSearchParams({
    title: issueTitle(minister),
    body: issueBody(minister, message),
    labels: "donnée",
  });
  return `https://github.com/${REPOSITORY}/issues/new?${params.toString()}`;
}

export function issueUrl(minister: Minister, message: string): string {
  let text = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  let url = build(minister, text);
  // Filet de sécurité : une fiche à très nombreux mandats pourrait, à elle seule,
  // rapprocher le lien de la limite. On raccourcit alors la fin du message plutôt
  // que de produire une URL que GitHub refuserait d'ouvrir.
  while (url.length > MAX_URL_LENGTH && text.length > 0) {
    text = text.slice(0, Math.floor(text.length * 0.8));
    url = build(minister, text);
  }
  return url;
}
