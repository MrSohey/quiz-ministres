/**
 * Aléa reproductible. Voir CLAUDE.md §7.7.
 *
 * Deux joueurs qui ouvrent le même lien doivent voir exactement les mêmes photos,
 * dans le même ordre. Cela suppose un générateur déterministe — même graine, même
 * suite — là où le jeu utilisait `Math.random`.
 */
import type { Rng } from "./deck";
import type { Minister } from "./types";

/** Alphabet des graines : chiffres et minuscules, sans ambiguïté à l'oral. */
const SEED_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/** Longueur d'une graine engendrée. 6 caractères ≈ un milliard de parties. */
const SEED_LENGTH = 6;

/**
 * Hachage FNV-1a 32 bits. Rapide, sans dépendance, et suffisant ici : on cherche
 * une dispersion correcte, pas une résistance cryptographique.
 */
function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Générateur mulberry32 : 32 bits d'état, une dizaine d'opérations par tirage.
 *
 * Le générateur porte un état, il ne peut donc PAS être passé dans une action du
 * réducteur : React StrictMode double-invoque les réducteurs en développement, ce
 * qui consommerait deux valeurs au lieu d'une et ferait diverger la partie entre
 * développement et production. Il n'est utilisé qu'une fois, au démarrage, pour
 * fixer l'ordre de passage complet (voir `reducer.ts`).
 */
export function createSeededRng(seed: string): Rng {
  let state = hash32(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Engendre une graine lisible. Impur : à appeler depuis l'interface, jamais depuis
 * le réducteur.
 */
export function randomSeed(): string {
  let seed = "";
  for (let i = 0; i < SEED_LENGTH; i++) {
    const index = Math.floor(Math.random() * SEED_ALPHABET.length);
    seed += SEED_ALPHABET.charAt(index);
  }
  return seed;
}

/** Une graine reçue par URL peut être n'importe quoi : on la borne avant usage. */
export function isValidSeed(seed: string): boolean {
  return /^[a-z0-9]{1,16}$/.test(seed);
}

/**
 * Empreinte du vivier d'un niveau.
 *
 * Une graine ne fige que le tirage, pas les données : si la base gagne ou perd une
 * fiche, le même lien produit une autre partie. L'empreinte permet de le détecter
 * et de prévenir le joueur plutôt que de lui promettre à tort une partie identique.
 */
export function poolFingerprint(pool: readonly Minister[]): string {
  const ids = pool
    .map((minister) => minister.id)
    .sort()
    .join(",");
  return hash32(ids).toString(36);
}
