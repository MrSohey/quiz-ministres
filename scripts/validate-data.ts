/**
 * Valide `data/ministers.json` contre le schéma Zod. Fait échouer le build.
 * Aucun accès réseau : voir `check-photo-links.ts` pour la vérification des photos.
 */
import { readFileSync } from "node:fs";
import { ministersSchema } from "../data/ministers.schema";

const PATH = new URL("../data/ministers.json", import.meta.url);

const parsed: unknown = JSON.parse(readFileSync(PATH, "utf8"));
const result = ministersSchema.safeParse(parsed);

if (!result.success) {
  console.error("❌ ministers.json est invalide :\n");
  for (const issue of result.error.issues) {
    console.error(`  · ${issue.path.join(".") || "(racine)"} — ${issue.message}`);
  }
  process.exit(1);
}

const ministers = result.data;
const byDifficulty = ministers.reduce<Record<number, number>>((acc, m) => {
  acc[m.difficulty] = (acc[m.difficulty] ?? 0) + 1;
  return acc;
}, {});

console.log(`✅ ${ministers.length} fiches valides`);
console.log(
  `   difficulté 1 : ${byDifficulty[1] ?? 0} · 2 : ${byDifficulty[2] ?? 0} · 3 : ${byDifficulty[3] ?? 0}`,
);
