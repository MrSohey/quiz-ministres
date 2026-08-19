/**
 * Vérifie que chaque photo est toujours servie par Wikimedia Commons.
 *
 * Les images ne sont pas hébergées dans le repo (CLAUDE.md §6.3) : une suppression
 * sur Commons casserait silencieusement une fiche. Ce script tourne en CI une fois
 * par semaine et à chaque modification de `ministers.json`.
 *
 * Enchaîner ~200 requêtes déclenche les quotas de Wikimedia : sans étalement ni
 * reprise sur 429, le script signalerait des photos « disparues » qui existent
 * parfaitement. Un 429 n'est jamais traité comme un échec de lien.
 */
import { readFileSync } from "node:fs";
import { ministersSchema } from "../data/ministers.schema";
import { photoUrl } from "../src/game/photoUrl";

// La politique d'accès Wikimedia exige un User-Agent descriptif et joignable.
const USER_AGENT =
  "quiz-ministres/0.1 (https://github.com/MrSohey/quiz-ministres; verification hebdomadaire des liens)";

/** Pause entre deux requêtes, pour rester sous les quotas. */
const DELAY_MS = 120;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Check = { ok: true } | { ok: false; reason: string };

async function checkOne(commonsFile: string): Promise<Check> {
  const url = photoUrl(commonsFile);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.ok) return { ok: true };

      // 429 (quota) et 5xx (incident) ne disent rien sur l'existence du fichier :
      // on réessaie avec un délai croissant plutôt que de crier au lien mort.
      const transient = response.status === 429 || response.status >= 500;
      if (!transient) return { ok: false, reason: `HTTP ${response.status}` };

      if (attempt === MAX_ATTEMPTS) {
        return {
          ok: false,
          reason: `HTTP ${response.status} après ${MAX_ATTEMPTS} essais`,
        };
      }
      const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2000 * attempt);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) return { ok: false, reason: String(error) };
      await sleep(2000 * attempt);
    }
  }
  return { ok: false, reason: "inatteignable" };
}

const PATH = new URL("../data/ministers.json", import.meta.url);
const ministers = ministersSchema.parse(JSON.parse(readFileSync(PATH, "utf8")));

const failures: string[] = [];

for (const [index, minister] of ministers.entries()) {
  const result = await checkOne(minister.photo.commonsFile);
  if (result.ok) {
    process.stdout.write(".");
  } else {
    failures.push(`${minister.id} — ${result.reason} — ${minister.photo.commonsFile}`);
    process.stdout.write("x");
  }
  if ((index + 1) % 60 === 0) process.stdout.write(` ${index + 1}/${ministers.length}\n`);
  await sleep(DELAY_MS);
}
process.stdout.write("\n");

if (failures.length > 0) {
  console.error(`\n${failures.length} photo(s) indisponible(s) :`);
  for (const failure of failures) console.error(`  · ${failure}`);
  console.error(
    "\nCorrigez `commonsFile` dans data/ministers.json, ou retirez la fiche.",
  );
  process.exit(1);
}

console.log(`${ministers.length} photos disponibles.`);
