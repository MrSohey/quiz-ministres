/**
 * Défi partageable : encodage et lecture du lien. Voir CLAUDE.md §7.7.
 *
 * Tout tient dans l'URL, conformément à la contrainte « aucun backend » (§1). Un
 * défi se transmet donc par n'importe quel canal, sans compte ni serveur.
 */
import { LEVEL_IDS, type LevelId } from "./levels";
import { isValidSeed } from "./seed";

/** Nom du paramètre d'URL. En français : le lien est destiné à être lu. */
export const CHALLENGE_PARAM = "defi";

/** Séparateur des trois champs. Le point survit à tous les raccourcisseurs d'URL. */
const SEPARATOR = ".";

export interface Challenge {
  level: LevelId;
  seed: string;
  /** Empreinte du vivier au moment où le défi a été créé (voir `poolFingerprint`). */
  fingerprint: string;
}

/** Valeur du paramètre, par exemple `facile.k3m9qz.1abc`. */
export function encodeChallenge(challenge: Challenge): string {
  return [challenge.level, challenge.seed, challenge.fingerprint].join(SEPARATOR);
}

/**
 * Lit un défi depuis une chaîne de requête. Renvoie `null` dès que quoi que ce soit
 * cloche : un lien tronqué ou bricolé doit ramener à l'accueil, pas planter le jeu.
 */
export function decodeChallenge(search: string): Challenge | null {
  const raw = new URLSearchParams(search).get(CHALLENGE_PARAM);
  if (raw === null) return null;

  const parts = raw.split(SEPARATOR);
  if (parts.length !== 3) return null;

  const [level, seed, fingerprint] = parts as [string, string, string];
  if (!(LEVEL_IDS as readonly string[]).includes(level)) return null;
  if (!isValidSeed(seed)) return null;
  if (!/^[a-z0-9]{1,10}$/.test(fingerprint)) return null;

  return { level: level as LevelId, seed, fingerprint };
}

/** URL complète à partager, en repartant de la page courante sans ses paramètres. */
export function challengeUrl(challenge: Challenge, currentUrl: string): string {
  const url = new URL(currentUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set(CHALLENGE_PARAM, encodeChallenge(challenge));
  return url.toString();
}
