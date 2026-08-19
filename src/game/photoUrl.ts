/**
 * Construction de l'URL d'une photo hébergée sur Wikimedia Commons.
 * Voir CLAUDE.md §6.3.
 */

const COMMONS_FILE_PATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

/**
 * Largeurs alignées sur les paliers de vignettes déjà générés par Commons :
 * demander une largeur exotique fait produire une vignette à la volée, plus lente.
 */
export type PhotoWidth = 320 | 500 | 800;

/**
 * On passe par `Special:FilePath` plutôt que par une URL `upload.wikimedia.org` en
 * dur. C'est deux redirections de plus (~185 ms), mais c'est la seule forme qui
 * survive au renommage d'un fichier sur Commons — et le préchargement de la manche
 * suivante rend ce délai invisible.
 *
 * Le paramètre `width` n'est pas optionnel dans les faits : sans lui, Commons sert
 * l'original, soit 862 Ko au lieu de 86 Ko sur un cas mesuré.
 */
export function photoUrl(commonsFile: string, width: PhotoWidth = 500): string {
  return `${COMMONS_FILE_PATH}${encodeURIComponent(commonsFile)}?width=${width}`;
}

/** Page de description du fichier sur Commons, pour la page « Crédits ». */
export function photoDescriptionUrl(commonsFile: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(commonsFile)}`;
}
