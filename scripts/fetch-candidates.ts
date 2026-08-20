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
 * Wikidata ne décrit pas les postes ministériels français de façon homogène. Une
 * liste d'identifiants écrite à la main laissait 51 ministres de côté ; on énumère
 * donc les postes par TROIS voies complémentaires, dont l'union seule est complète :
 *
 *  1. `P31 = poste` + `P17 = France`, filtré sur le libellé ;
 *  2. les organisations « ministère » — le `P39` de Simone Veil pointe vers le
 *     ministère de la Santé, une organisation, et non vers un poste ;
 *  3. `P1001 = France`, que certains postes portent sans avoir le `P31` attendu —
 *     c'est le cas de « ministre du Travail ».
 *
 * « haut-commissaire » est volontairement absent des préfixes : le titre n'est
 * gouvernemental qu'une fois sur deux et faisait entrer des hauts-commissaires à
 * l'énergie atomique, qui sont des conseillers scientifiques.
 */
const PREFIXES = [
  "ministre",
  "secrétaire d'État",
  "garde des Sceaux",
  "Premier ministre",
  "porte-parole du gouvernement",
];

const filtreLibelle = `FILTER(${PREFIXES.map((p) => `STRSTARTS(?l, "${p}")`).join(
  " || ",
)})`;

/** Classes Wikidata des ministères, pour la deuxième voie. */
const CLASSES_MINISTERE = ["Q2305901", "Q14037025", "Q1519799", "Q192350"];

/**
 * Phase 1 : énumérer les postes. Séparée de la phase 2 à dessein — jointe à la
 * recherche des titulaires, la requête dépasse le délai de WDQS (504).
 */
const REQUETE_POSTES = `
SELECT DISTINCT ?position WHERE {
  { ?position wdt:P31 wd:Q4164871 ; wdt:P17 wd:Q142 ; rdfs:label ?l .
    FILTER(LANG(?l) = "fr") ${filtreLibelle} }
  UNION
  { VALUES ?classe { ${CLASSES_MINISTERE.map((q) => `wd:${q}`).join(" ")} }
    ?position wdt:P31 ?classe ; wdt:P17 wd:Q142 . }
  UNION
  { ?position wdt:P1001 wd:Q142 ; rdfs:label ?l .
    FILTER(LANG(?l) = "fr") ${filtreLibelle} }
}
`;

/** Phase 2 : les titulaires, par lots de postes. */
function requeteTitulaires(positions: readonly string[]): string {
  return `
SELECT ?person ?personLabel ?positionLabel ?image ?start ?end ?partyLabel WHERE {
  VALUES ?position { ${positions.map((q) => `wd:${q}`).join(" ")} }
  ?person p:P39 ?statement .
  ?statement ps:P39 ?position ; pq:P580 ?start .
  OPTIONAL { ?statement pq:P582 ?end . }
  OPTIONAL { ?person wdt:P18 ?image . }
  OPTIONAL { ?person wdt:P102 ?party . }
  FILTER(?start >= "1958-01-01T00:00:00Z"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY ?personLabel ?start
`;
}

interface Binding {
  [key: string]: { value: string } | undefined;
}

async function interroger(requete: string): Promise<Binding[]> {
  const response = await fetch(`${ENDPOINT}?query=${encodeURIComponent(requete)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
  });
  if (!response.ok) {
    console.error(`Wikidata a répondu ${response.status}`);
    process.exit(1);
  }
  const payload = (await response.json()) as { results: { bindings: Binding[] } };
  return payload.results.bindings;
}

const positions = (await interroger(REQUETE_POSTES))
  .map((row) => row.position?.value.split("/").pop() ?? "")
  .filter(Boolean);
console.error(`${positions.length} postes ministériels énumérés`);

const bindings = await interroger(requeteTitulaires(positions));

const candidates = bindings.map((row) => ({
  wikidataId: row.person?.value.split("/").pop() ?? "",
  // Un libellé qui vaut « Q12345 » signale une entité sans nom français : le titre
  // de son article Wikipédia est alors la seule source utilisable. Deux ministres
  // étaient dans ce cas — Bernard Kouchner et Emmanuel Macron.
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
