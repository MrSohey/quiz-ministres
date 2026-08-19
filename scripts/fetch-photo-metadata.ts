/**
 * Récupère auteur et licence d'un fichier Commons, pour remplir `photo.credit` et
 * `photo.license` (CLAUDE.md §6.2).
 *
 * Le hotlinking ne dispense pas des obligations d'attribution : une fiche sans
 * crédit ni licence est refusée par le schéma.
 *
 * Usage : npx tsx scripts/fetch-photo-metadata.ts "Michel Debré.jpg" ["autre.jpg" …]
 */

const USER_AGENT =
  "quiz-ministres/0.1 (https://github.com/MrSohey/quiz-ministres; releve des licences)";

/** Les métadonnées Commons contiennent du HTML : on n'en garde que le texte. */
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ExtMetadata {
  [key: string]: { value: string } | undefined;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage : npx tsx scripts/fetch-photo-metadata.ts "Nom du fichier.jpg"');
  process.exit(1);
}

const titles = files.map((file) => `File:${file}`).join("|");
const url =
  "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
  "&prop=imageinfo&iiprop=extmetadata&titles=" +
  encodeURIComponent(titles);

const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
const payload = (await response.json()) as {
  query?: {
    pages?: Record<string, { title: string; imageinfo?: [{ extmetadata: ExtMetadata }] }>;
  };
};

for (const page of Object.values(payload.query?.pages ?? {})) {
  const info = page.imageinfo?.[0];
  if (!info) {
    console.error(`❌ introuvable sur Commons : ${page.title}`);
    continue;
  }
  const meta = info.extmetadata;
  const read = (key: string) => stripHtml(meta[key]?.value ?? "");

  console.log(`\n--- ${page.title.replace(/^File:/, "")}`);
  console.log(`  credit  : ${read("Artist") || "(non renseigné)"}`);
  console.log(`  license : ${read("LicenseShortName") || "(non renseignée)"}`);
  const restrictions = read("Restrictions");
  if (restrictions) console.log(`  ⚠️ restrictions : ${restrictions}`);
  console.log(
    "  → vérifiez que la licence autorise la réutilisation avant d'ajouter la fiche.",
  );
}

export {};
