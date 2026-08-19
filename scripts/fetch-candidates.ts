/**
 * Interroge Wikidata pour lister des ministres français candidats à l'entrée en base.
 *
 * Ce script ne réécrit JAMAIS `ministers.json` : il produit une liste brute que
 * l'on trie à la main (CLAUDE.md §6.2). C'est délibéré — le tri demande des
 * jugements (notoriété, famille de portefeuille, difficulté) qu'aucune requête ne
 * sait rendre.
 *
 * Usage : npx tsx scripts/fetch-candidates.ts > data/candidates.raw.json
 */

const USER_AGENT =
  "quiz-ministres/0.1 (https://github.com/MrSohey/quiz-ministres; constitution de la base)";
const ENDPOINT = "https://query.wikidata.org/sparql";

/**
 * Positions ministérielles françaises interrogées. En ajouter revient à élargir le
 * périmètre : voir les critères d'inclusion du §5 avant de le faire.
 */
const POSITIONS: Record<string, string> = {
  "premier-ministre": "Q1587677",
};

const QUERY = `
SELECT ?person ?personLabel ?positionLabel ?image ?start ?end ?partyLabel WHERE {
  VALUES ?position { ${Object.values(POSITIONS)
    .map((q) => `wd:${q}`)
    .join(" ")} }
  ?person p:P39 ?statement .
  ?statement ps:P39 ?position .
  OPTIONAL { ?statement pq:P580 ?start . }
  OPTIONAL { ?statement pq:P582 ?end . }
  OPTIONAL { ?person wdt:P18 ?image . }
  OPTIONAL { ?person wdt:P102 ?party . }
  FILTER(BOUND(?start) && ?start >= "1958-01-01T00:00:00Z"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY ?personLabel ?start
`;

interface Binding {
  [key: string]: { value: string } | undefined;
}

const response = await fetch(`${ENDPOINT}?query=${encodeURIComponent(QUERY)}`, {
  headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
});
if (!response.ok) {
  console.error(`Wikidata a répondu ${response.status}`);
  process.exit(1);
}

const payload = (await response.json()) as { results: { bindings: Binding[] } };

const candidates = payload.results.bindings.map((row) => ({
  wikidataId: row.person?.value.split("/").pop() ?? "",
  name: row.personLabel?.value ?? "",
  position: row.positionLabel?.value ?? "",
  party: row.partyLabel?.value ?? "",
  startYear: row.start?.value.slice(0, 4) ?? "",
  endYear: row.end?.value.slice(0, 4) ?? "",
  // Nom de fichier Commons, prêt à recopier dans `photo.commonsFile`.
  commonsFile: row.image
    ? decodeURIComponent(row.image.value.split("/").pop() ?? "").replace(/_/g, " ")
    : null,
}));

console.log(JSON.stringify(candidates, null, 2));

export {};
