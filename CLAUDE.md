# Quiz des ministres de la Ve République

Jeu web : on montre la photo d'une personne ayant été ministre en France sous la
Ve République (depuis 1958), le joueur doit retrouver **son nom** et **un ministère
qu'elle a occupé**. En cas d'échec, le jeu délivre des indices successifs. En cas de
réussite, on enchaîne sur une nouvelle photo.

Ce fichier est la référence unique du projet : lis-le entièrement avant de coder,
et mets-le à jour quand une décision structurante change.

---

## 1. Contraintes non négociables

| Contrainte            | Décision                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Langage               | TypeScript strict, partout (y compris les scripts de données)                                                                        |
| Lisibilité            | Le code doit être reprenable par un humain non-expert : noms explicites en anglais, fonctions courtes, pas d'abstraction spéculative |
| Coût                  | **0 €** : pas d'hébergement payant, pas de nom de domaine, pas de base de données managée, pas d'API payante                         |
| Backend               | **Aucun.** Application 100 % statique, tout tourne dans le navigateur                                                                |
| Photos                | **Non hébergées** : liens directs vers Wikimedia Commons (voir §6.3)                                                                 |
| Hébergement           | GitHub Pages (URL en `*.github.io`), déploiement par GitHub Actions                                                                  |
| Langue de l'interface | Français                                                                                                                             |
| Langue du code        | Anglais (identifiants, commentaires, commits)                                                                                        |

### Anti-objectifs (ne pas faire sans demande explicite)

- Pas de compte utilisateur, pas d'authentification, pas de backend, pas de classement en ligne.
- Pas de state manager global (Redux, Zustand…) : `useReducer` suffit largement.
- Pas de framework ni d'utilitaire CSS (ni Tailwind, ni Bootstrap, ni CSS-in-JS) :
  du CSS écrit à la main, cf. §2.
- Pas d'appel à une **API** (Wikidata, Commons `api.php`, Wikipédia) à l'exécution :
  toutes les **données** sont figées dans `ministers.json` au moment du build. Les
  seules requêtes réseau au runtime sont le chargement des **images** depuis Wikimedia
  (§6.3), déclenché par des balises `<img>` ordinaires.
- Pas de génération de contenu par IA au runtime.

---

## 2. Stack

- **Vite** + **React 18** + **TypeScript** (mode `strict: true`).
- **Vitest** pour les tests unitaires (logique de jeu, normalisation, matching).
- **Zod** pour valider le fichier de données au build et dans les tests.
- **CSS simple**, une feuille par composant dans `src/styles/`, importée par le
  composant. Pas de Tailwind, pas de CSS-in-JS, pas de préprocesseur. Variables CSS
  natives (`:root { --color-… }`) pour la palette et les espacements.
- **ESLint** (config « flat ») avec `typescript-eslint` en mode typé et
  `eslint-plugin-react-hooks`. On cherche des bugs, pas un style : dépendances de
  hooks oubliées, `setState` dans un effet, `any`, promesses non attendues.
- **npm** (un seul `package-lock.json`).
- Node ≥ 20.

- **Prettier** pour le formatage, vérifié en CI (`npm run format:check`).

Le partage des rôles est net : **Prettier met en forme, ESLint corrige.** Aucune règle
de style n'est écrite dans `eslint.config.js` ; `eslint-config-prettier`, placé en
dernier, neutralise celles qui pourraient entrer en conflit. Une seule question à se
poser en revue : « est-ce juste ? », jamais « est-ce bien indenté ? ».

Réglages dans `.prettierrc.json` : `printWidth: 90`, guillemets doubles,
point-virgules, virgule finale partout.

`data/ministers.json` est dans `.prettierignore`. Il est produit par les scripts de
collecte puis édité à la main : lui imposer le format de Prettier ferait échouer la CI
à chaque régénération, alors que sa structure est déjà garantie par le schéma Zod.

Pour une liste dense qu'on veut lire en bloc — la table des mots vides de
`matching.ts` — utiliser `// prettier-ignore`. **La directive doit être seule sur sa
ligne** : y accoler une explication l'invalide silencieusement.

Pas d'autres dépendances sans raison écrite. En particulier : écrire soi-même la
distance de Levenshtein (~20 lignes) plutôt que d'ajouter une librairie.

---

## 3. Structure du repo

```
.
├── CLAUDE.md
├── README.md                      # installation, lancement, comment contribuer une fiche
├── index.html
├── vite.config.ts                 # base: '/<nom-du-repo>/' pour GitHub Pages
├── package.json
├── eslint.config.js               # règles de lint (format « flat »)
├── .github/workflows/
│   ├── ci.yml                     # lint + types + tests + build, sur chaque PR
│   ├── deploy.yml                 # build + publication sur GitHub Pages
│   └── check-links.yml            # contrôle hebdomadaire des photos Commons
├── data/
│   ├── ministers.json             # LA base de données, éditable à la main
│   └── ministers.schema.ts        # schéma Zod + types TS dérivés
├── scripts/
│   ├── fetch-candidates.ts        # requête Wikidata → liste de candidats à trier
│   ├── fetch-photo-metadata.ts    # API Commons → crédit + licence d'un fichier
│   ├── check-photo-links.ts       # HEAD sur chaque photo, signale les 404
│   └── validate-data.ts           # échoue si le JSON est invalide
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── game/
    │   ├── types.ts               # types du domaine
    │   ├── photoUrl.ts            # construit l'URL Commons à partir du nom de fichier
    │   ├── deck.ts                # tirage aléatoire sans répétition
    │   ├── portfolios.ts          # table des ministères : libellés, alias, sigles
    │   ├── levels.ts              # niveaux de difficulté et filtrage du vivier
    │   ├── matching.ts            # normalisation + comparaison des réponses
    │   ├── hints.ts               # échelle d'indices
    │   ├── scoring.ts             # calcul des points
    │   └── reducer.ts             # machine à états de la partie
    ├── components/
    │   ├── LevelPicker.tsx
    │   ├── PhotoCard.tsx
    │   ├── AnswerForm.tsx
    │   ├── HintPanel.tsx
    │   ├── RevealPanel.tsx
    │   ├── ScoreBar.tsx
    │   ├── EndScreen.tsx
    │   └── CreditsPage.tsx
    └── styles/
```

---

## 4. Modèle de données

### 4.1 Une fiche = **une personne**, pas un mandat

Beaucoup de ministres ont occupé plusieurs postes. Si on créait une fiche par mandat,
la même photo reviendrait plusieurs fois avec des réponses différentes — ambigu et
frustrant. Donc : **une fiche par personne**, contenant la liste de ses mandats.
Le joueur gagne s'il cite **au moins un** des ministères occupés ; la révélation les
affiche tous.

### 4.2 Types

```ts
// data/ministers.schema.ts (source de vérité, les types TS en sont dérivés via z.infer)

/** Identifiant stable, en kebab-case, sans accent. */
type MinisterId = string; // ex. "simone-veil"

/**
 * Famille de portefeuille, stable dans le temps.
 * Les intitulés officiels changent sans arrêt ("Ministère de l'Économie, des Finances
 * et de la Souveraineté industrielle et numérique"…) : le joueur répond sur la FAMILLE,
 * pas sur l'intitulé exact.
 */
type PortfolioId =
  | "premier-ministre"
  | "interieur"
  | "affaires-etrangeres"
  | "economie-finances"
  | "justice"
  | "defense"
  | "education-nationale"
  | "enseignement-superieur-recherche"
  | "sante-solidarites"
  | "travail-emploi"
  | "culture"
  | "agriculture"
  | "environnement-transition-ecologique"
  | "transports"
  | "logement"
  | "outre-mer"
  | "fonction-publique"
  | "sports"
  | "budget"
  | "industrie"
  | "commerce-exterieur"
  | "relations-parlement"
  | "porte-parole-gouvernement"
  | "autre";

/** Rang du poste. C'est lui qui sépare les niveaux de difficulté (§7.7). */
type MandateRank = "ministre" | "ministre-delegue" | "secretaire-etat";

interface Mandate {
  portfolio: PortfolioId;
  rank: MandateRank;
  /**
   * Intitulé affiché à la révélation.
   *
   * Pour un ministre de plein exercice, c'est le `holderLabel` du portefeuille et
   * NON l'intitulé exact de l'époque : Wikidata ne fournit que le nom actuel du
   * ministère, ce qui donnerait « ministre de l'Économie, des Finances et de la
   * Souveraineté industrielle et numérique » pour un mandat de 1966.
   * Pour un délégué ou un secrétaire d'État, l'intitulé précis est conservé.
   */
  officialTitle: string;
  /** Années uniquement (pas de mois, pas de jours). */
  startYear: number;
  /** `null` si le mandat est en cours. */
  endYear: number | null;
}

interface Minister {
  id: MinisterId;
  firstName: string;
  lastName: string;
  /** Formes alternatives acceptées : nom de jeune fille, particule, orthographe usuelle. */
  aliases: string[];
  /** Étiquette lisible, ex. "UMP / LR", "PS", "Sans étiquette". */
  party: string;
  /** Famille politique large, sert d'indice : "gauche" | "centre" | "droite" | "autre". */
  politicalFamily: "gauche" | "centre" | "droite" | "autre";
  mandates: Mandate[]; // au moins un, triés par startYear croissant
  photo: {
    /**
     * Nom du fichier sur Wikimedia Commons, SANS le préfixe "File:".
     * ex. "Simone Veil 1984.jpg". L'URL est construite à l'exécution (voir §6.3).
     * On stocke le nom et non l'URL : c'est ce qui rend le lien résistant aux
     * renommages de fichiers sur Commons.
     */
    commonsFile: string;
    credit: string; // auteur de la photo, affiché à la révélation
    license: string; // ex. "CC BY-SA 4.0", "Licence Ouverte / Etalab 2.0"
  };
  /** URL Wikipédia FR ou Wikidata, pour vérification humaine. Obligatoire. */
  sourceUrl: string;
  /** Difficulté estimée, sert à ordonner les parties. */
  difficulty: 1 | 2 | 3; // 1 = très connu, 3 = obscur
}
```

`data/ministers.json` est un tableau de `Minister`. Il est **éditable à la main** :
c'est voulu, une personne doit pouvoir corriger une date ou ajouter une fiche sans
lancer de script.

### 4.3 Règles de qualité des données

- **Aucune donnée inventée.** Chaque fiche a un `sourceUrl` vérifiable. Si une info
  est incertaine, ne pas créer la fiche.
- Les années sont des entiers à 4 chiffres, `startYear <= endYear`, `startYear >= 1958`.
- Un `id` doit être unique dans tout le fichier.
- Une fiche sans photo utilisable **n'entre pas dans la base**.
- `scripts/validate-data.ts` vérifie tout ça et **fait échouer le build** sinon.
  Il tourne aussi en CI.

---

## 5. Périmètre de la base

**Cible : 150 à 250 personnes**, de 1958 à aujourd'hui.

Critères d'inclusion, par ordre de priorité :

1. Tous les Premiers ministres depuis 1958 (~25 personnes) — socle indispensable.
2. Les titulaires des grands ministères régaliens : Intérieur, Affaires étrangères,
   Économie/Finances, Justice, Défense, Éducation nationale.
3. Les ministres notoires des autres portefeuilles (Culture, Santé, Environnement…)
   ayant une notoriété publique réelle.
4. Compléter jusqu'à ~200 avec des figures reconnaissables.

**Exclus** : secrétaires d'État et ministres délégués peu connus, sauf s'ils sont
devenus notoires par ailleurs. On ne cherche pas l'exhaustivité (elle dépasserait
1000 personnes, avec des photos introuvables et un jeu injouable).

Répartition visée par `difficulty` : ~30 % niveau 1, ~45 % niveau 2, ~25 % niveau 3.

---

## 6. Constitution de la base

### 6.1 Sources

| Besoin                             | Source                | Remarque                                 |
| ---------------------------------- | --------------------- | ---------------------------------------- |
| Liste des ministres, postes, dates | **Wikidata** (SPARQL) | Structuré, requêtable, licence CC0       |
| Vérification / nuances             | **Wikipédia FR**      | Les listes par gouvernement sont fiables |
| Photos                             | **Wikimedia Commons** | Seule source retenue, voir §6.3          |

### 6.2 Pipeline (semi-automatique, revue humaine obligatoire)

1. `scripts/fetch-candidates.ts` interroge le SPARQL endpoint de Wikidata
   (`https://query.wikidata.org/sparql`) pour lister les personnes ayant occupé une
   position de ministre français après 1958, avec leur image Commons quand elle existe.
   Sortie : `data/candidates.raw.json` (non versionné, ou versionné mais jamais lu par l'app).
2. **Un humain (ou Claude, sous revue) trie** : sélection selon §5, attribution du
   `portfolio`, de la `difficulty`, des `aliases`, nettoyage des intitulés.
   Résultat écrit dans `data/ministers.json`.
3. `scripts/fetch-photo-metadata.ts` interroge l'API Commons pour chaque
   `commonsFile` retenu et récupère l'auteur et la licence (champ `extmetadata`),
   qui sont recopiés dans `credit` et `license`. Les images ne sont **pas**
   téléchargées.
4. `scripts/validate-data.ts` valide le tout.

Les scripts sont **idempotents** et ne réécrivent jamais `ministers.json` :
seul l'humain édite ce fichier.

### 6.3 Photos — liens directs vers Wikimedia Commons

**Décision : les images ne sont pas hébergées dans le repo, elles sont chargées
directement depuis Wikimedia** (« hotlinking »).

#### Cadre juridique

La page [Commons:Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
dit textuellement : _« Directly using a Commons file via embedding its URL
("hotlinking") is also possible, but is not recommended »_. C'est donc **autorisé
mais non encouragé**. À l'échelle d'un jeu amateur c'est un usage acceptable ; si le
trafic devenait significatif, il faudrait basculer vers des images auto-hébergées
(§6.4).

Le hotlinking **ne dispense pas** des obligations de licence. Règles inchangées :

- **Uniquement des fichiers Wikimedia Commons** dont la licence autorise la
  réutilisation : domaine public, CC0, CC BY, CC BY-SA, ou Licence Ouverte / Etalab.
- **Refuser** tout fichier en « fair use », « usage éditorial », ou sans licence
  claire. Beaucoup de portraits officiels récents sont sous copyright : dans le
  doute, on n'inclut pas la personne.
- `credit` et `license` sont **obligatoires**, affichés dans l'écran de révélation,
  et repris sur une page « Crédits » listant toutes les images avec un lien vers leur
  page Commons.

#### Construction de l'URL — `src/game/photoUrl.ts`

Utiliser **`Special:FilePath`**, jamais une URL `upload.wikimedia.org` en dur :

```ts
const COMMONS_FILE_PATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

/**
 * Largeurs alignées sur les paliers de vignettes déjà générés par Commons :
 * demander une largeur exotique fait produire une vignette à la volée, plus lente.
 */
export type PhotoWidth = 320 | 500 | 800;

export function photoUrl(commonsFile: string, width: PhotoWidth = 500): string {
  // encodeURIComponent gère les espaces, parenthèses et accents des noms de fichiers.
  return `${COMMONS_FILE_PATH}${encodeURIComponent(commonsFile)}?width=${width}`;
}
```

Pourquoi `Special:FilePath` et pas l'URL directe `upload.wikimedia.org/.../thumb/...` :

|                                                | `Special:FilePath`               | URL `upload.wikimedia.org` en dur |
| ---------------------------------------------- | -------------------------------- | --------------------------------- |
| Requêtes                                       | 3 (2 redirections non cachables) | 1, entièrement cachée par le CDN  |
| Latence mesurée                                | ~0,27 s                          | ~0,08 s                           |
| Survit au **renommage** du fichier sur Commons | **oui**                          | non                               |
| Donnée à stocker                               | le nom du fichier                | l'URL complète, avec son hash MD5 |

Les renommages sont fréquents sur Commons et casseraient silencieusement des fiches.
Les ~185 ms de surcoût sont neutralisés par le **préchargement de la photo suivante**
(§8.3) : le joueur ne les voit jamais.

⚠️ **Toujours passer `?width=`.** Sans ce paramètre, Commons sert l'original :
862 Ko contre 86 Ko en 500 px sur un cas testé, soit 10× plus lourd.

#### Points techniques vérifiés

- L'image finale renvoie `access-control-allow-origin: *` → aucun problème de CORS.
- Elle est servie par le CDN Wikimedia avec un cache chaud (`x-cache: hit`).
- Un fichier **supprimé** de Commons renvoie **404**.

#### Garde-fous contre le lien mort

1. `scripts/check-photo-links.ts` fait une requête `HEAD` sur chaque photo et sort en
   erreur si l'une renvoie autre chose que 200. Lancé par
   `.github/workflows/check-links.yml` **une fois par semaine** (`schedule: cron`) et
   à chaque modification de `ministers.json`. Un échec ouvre une issue GitHub.
   Envoyer un `User-Agent` descriptif, comme l'exige la politique d'accès Wikimedia.
2. Dans l'interface, `<img onError={…}>` marque la fiche comme indisponible et
   **passe à la personne suivante** au lieu d'afficher une manche cassée.

### 6.4 Repli : auto-héberger les images

Si Wikimedia devient un point de fragilité (404 en série, changement de politique,
trafic élevé), le repli est simple et reste gratuit :

1. Écrire `scripts/download-photos.ts` : télécharge chaque `commonsFile` en 500 px,
   convertit en WebP qualité 80, écrit dans `public/photos/<id>.webp`.
2. Faire retourner à `photoUrl()` un chemin local.

~200 images × ~60 Ko ≈ 12 Mo, très loin de la limite de 1 Go de GitHub Pages.
Ne pas faire ce travail tant que le besoin ne s'est pas manifesté.

### 6.5 Amorçage

Pour démarrer, créer d'abord **10 fiches à la main** (Premiers ministres très connus),
en cherchant chaque photo sur Commons et en relevant son nom de fichier, son auteur et
sa licence. Faire tourner le jeu complet dessus. On industrialise la collecte seulement
une fois la boucle de jeu validée.

---

## 7. Logique de jeu

### 7.1 Boucle

```
[Accueil] → [Manche] ⇄ [Indice] → [Révélation] → [Manche suivante] … → [Fin de partie]
```

Une **partie** = 10 manches (constante `ROUNDS_PER_GAME`, modifiable).
Une **manche** = une photo, deux réponses attendues (nom + ministère).

### 7.2 États d'une manche

```ts
type RoundStatus =
  | "asking" // le joueur cherche
  | "nameFound" // nom trouvé, ministère pas encore
  | "portfolioFound" // ministère trouvé, nom pas encore
  | "solved" // les deux trouvés
  | "revealed"; // abandon ou indices épuisés
```

Les deux réponses sont **indépendantes** : trouver le nom ne révèle pas le ministère,
et réciproquement. Chaque champ trouvé se verrouille (affiché en vert, non éditable).

### 7.3 Tirage aléatoire — `game/deck.ts`

Ne **jamais** faire `ministers[Math.floor(Math.random() * n)]` à chaque manche : on
reverrait deux fois la même personne dans la même partie.

Utiliser un « sac » : mélanger la liste (Fisher-Yates) au début de la partie, piocher
en tête. Le sac est reconstitué quand il est vide, en garantissant que la première
carte du nouveau sac n'est pas la dernière de l'ancien.

Optionnel (v2) : pondérer par `difficulty` pour une montée progressive.

### 7.4 Comparaison des réponses — `game/matching.ts`

C'est le cœur de l'expérience : **être généreux**. Un joueur qui écrit « chirac » ou
« Jaques Chirac » a trouvé. Les **deux** champs sont en saisie libre et tolérants aux
fautes.

#### Normalisation (commune aux deux champs)

Appliquée aux deux côtés avant comparaison :

1. passage en minuscules ;
2. suppression des accents (`normalize("NFD")` + suppression des diacritiques) ;
3. remplacement des tirets et apostrophes (droites et typographiques) par des espaces ;
4. suppression de la ponctuation restante ;
5. compression des espaces multiples, `trim`.

#### Acceptation du nom

La réponse est correcte si, après normalisation, elle correspond à l'un des cas
suivants :

- égale au nom complet (`prénom nom`) ou au nom seul (`nom`) ;
- égale à un des `aliases` ;
- distance de Levenshtein tolérée sur le **nom de famille** :
  - longueur ≤ 5 → distance 0
  - longueur 6-9 → distance ≤ 1
  - longueur ≥ 10 → distance ≤ 2
- les particules (`de`, `d`, `du`, `le`, `la`, `van`) sont optionnelles des deux côtés.

⚠️ Ne pas appliquer de tolérance floue sur des noms courts et proches : `Debré` /
`Debray`, `Fabius` / `Fabien`. Les tests unitaires doivent couvrir ces pièges.

#### Acceptation du ministère

Le champ est en **saisie libre**, comme celui du nom (des suggestions sont proposées,
mais rien n'oblige à en choisir une). Même exigence de générosité : un joueur qui écrit
« mae », « affaires etrangeres » ou « afaires étrangères » a trouvé.

La table des appellations vit dans **`src/game/portfolios.ts`** — dans le code, pas
dans `ministers.json`, parce qu'elle décrit un portefeuille et non une personne.

```ts
interface Portfolio {
  id: PortfolioId;
  /** Intitulé de référence, affiché dans les suggestions et à la révélation. */
  canonicalLabel: string;
  /**
   * Appellations complètes acceptées : intitulés historiques, formes courtes,
   * métonymies. Comparées avec tolérance aux fautes.
   */
  aliases: string[];
  /**
   * Sigles. Comparés en correspondance EXACTE uniquement (voir plus bas).
   */
  acronyms: string[];
}
```

Exemple pour `affaires-etrangeres` :

```ts
{
  id: "affaires-etrangeres",
  canonicalLabel: "Ministère de l'Europe et des Affaires étrangères",
  aliases: [
    "affaires étrangères",
    "europe et affaires étrangères",
    "affaires étrangères et européennes",
    "affaires étrangères et développement international",
    "relations extérieures",        // intitulé de 1981-1986
    "quai d'orsay",                 // métonymie
    "diplomatie",
  ],
  acronyms: ["mae", "meae", "maee", "maedi"],
}
```

Chaque portefeuille doit être documenté de la même façon : intitulés historiques
successifs, forme courte usuelle, métonymie s'il y en a une (« Bercy » →
`economie-finances`, « Place Beauvau » → `interieur`, « Matignon » →
`premier-ministre`, « Rue de Grenelle » → `education-nationale`,
« Hôtel de Brienne » → `defense`), et sigles.

#### Algorithme de résolution — `resolvePortfolio(input): PortfolioId[]`

La fonction renvoie la **liste** des portefeuilles compatibles avec la saisie (souvent
un seul, parfois plusieurs). Étapes, dans l'ordre, on s'arrête au premier niveau qui
donne au moins un résultat :

1. **Normalisation** : la même qu'au §7.4 pour le nom, plus la suppression des mots
   vides propres au domaine, en tête de chaîne uniquement : `ministere`, `ministre`,
   `secretariat d etat`, `de`, `du`, `des`, `d`, `la`, `le`, `les`, `a`, `au`, `aux`,
   `et`. Ainsi « Ministère de l'Europe et des Affaires étrangères » et « affaires
   étrangères » se réduisent tous deux à un jeu de mots comparable.
2. **Sigle** : si la saisie normalisée fait ≤ 5 caractères et sans espace, on la
   compare aux `acronyms` en **égalité stricte**. On s'arrête là, qu'il y ait un
   résultat ou non.
3. **Égalité** avec `canonicalLabel` ou un `alias`, après normalisation.
4. **Inclusion de mots** : la saisie est acceptée si l'ensemble de ses mots
   significatifs est inclus dans celui d'un alias, **et** contient au moins un mot
   discriminant (§ ci-dessous). C'est ce qui fait passer « affaires étrangères »
   pour « europe et affaires étrangères ».
5. **Tolérance aux fautes** : distance de Levenshtein entre la saisie normalisée et
   chaque alias normalisé, avec le même barème que pour les noms (≤ 5 → 0 ; 6-9 → 1 ;
   ≥ 10 → 2). Appliquée en dernier recours, jamais aux sigles.

**La réponse est correcte si l'intersection entre les portefeuilles résolus et ceux
des mandats de la personne n'est pas vide.** En cas de saisie ambiguë, on tranche donc
en faveur du joueur — c'est délibéré.

#### ⚠️ Les sigles ne tolèrent jamais les fautes

C'est le piège principal. Sur 3 ou 4 lettres, une distance de 1 rend tous les sigles
équivalents : `mae` (affaires étrangères), `maa` (agriculture), `men` (éducation
nationale), `mes` (enseignement supérieur), `mte` (transition écologique). D'où
l'étape 2 en égalité stricte, terminale : si quelqu'un écrit « mea », c'est faux, on
ne devine pas.

#### ⚠️ Mots discriminants et collisions

Un mot est **discriminant** s'il n'apparaît que dans les alias d'un seul portefeuille.
`etrangeres` est discriminant ; `affaires`, `nationale`, `ministere`, `sociales` ne le
sont pas. L'étape 4 exige au moins un mot discriminant, sinon « affaires » seul
validerait « affaires étrangères », « affaires sociales » et « affaires européennes »
indifféremment.

Ce calcul est **dérivé automatiquement de la table** au chargement du module, pas
écrit à la main : ajouter un alias recalcule les mots discriminants tout seul.

Paires à surveiller lors de la rédaction de la table :
`education-nationale` / `enseignement-superieur-recherche` · `economie-finances` /
`budget` / `industrie` · `travail-emploi` / `sante-solidarites` ·
`environnement-transition-ecologique` / `agriculture` / `transports` ·
`defense` / `interieur` (« armées », « sécurité »).

### 7.5 Indices — `game/hints.ts`

Échelle fixe, dans cet ordre. Le joueur les demande explicitement (bouton « Indice »),
ils ne se déclenchent jamais tout seuls.

| #   | Indice                                             | Exemple                                 | Condition                  |
| --- | -------------------------------------------------- | --------------------------------------- | -------------------------- |
| 1   | Période d'exercice (décennie du premier mandat)    | « A exercé dans les années 1990 »       | toujours                   |
| 2   | Famille politique                                  | « Famille politique : droite »          | `politicalFamily !== null` |
| 3   | Nombre de mandats + nombre de ministères distincts | « 3 mandats, 2 ministères différents »  | toujours                   |
| 4   | Initiales et longueur du nom                       | « J. C. — nom de famille en 6 lettres » | toujours                   |
| 5   | Parti politique précis                             | « Parti politique : RPR »               | `party !== null`           |
| 6   | Années exactes du premier mandat                   | « 1986-1988 »                           | toujours                   |

**Les indices 2 et 5 sont optionnels.** Une vingtaine de ministres issus de la société
civile (Dupond-Moretti, Pap Ndiaye, Francis Mer, Rima Abdul Malak…) n'ont réellement
aucune étiquette : `party` et `politicalFamily` valent alors `null`. L'absence est une
information exacte, pas une lacune — on ne l'invente pas.

Ces indices sont alors **escamotés**, pas affichés en « inconnu » : facturer 10 points
pour zéro information serait une punition. Le compteur du bouton suit :
« Indice (2/4) » au lieu de « (2/6) ». `maxHintsFor(minister)` donne le nombre réel ;
`MAX_HINTS` n'est plus que la borne théorique.

`data.test.ts` impose un plancher de **quatre indices par fiche** : en dessous, une
manche deviendrait indevinable pour un joueur bloqué.

Après le 6e indice, le bouton devient « Donner la réponse » → passage en `revealed`.

Les indices déjà obtenus restent affichés pendant toute la manche.

### 7.7 Niveaux de difficulté — `game/levels.ts`

Le joueur choisit un niveau avant de commencer. Les trois viviers sont **gigognes** :
monter de niveau, c'est retrouver les personnes déjà connues noyées dans un ensemble
plus large.

| Niveau            | Critère                                                      | Vivier         |
| ----------------- | ------------------------------------------------------------ | -------------- |
| **Facile**        | Postes régaliens de plein exercice, exercés en 1981 ou après | ~80 personnes  |
| **Intermédiaire** | Tous les ministères de plein exercice depuis 1958            | ~160 personnes |
| **Difficile**     | Idem, plus les ministres délégués et secrétaires d'État      | ~186 personnes |

Postes **régaliens** : `premier-ministre`, `interieur`, `affaires-etrangeres`,
`justice`, `defense`, `economie-finances`. Bercy y figure parce que son titulaire est
aussi exposé médiatiquement que celui de l'Intérieur.

Une personne entre dans un niveau dès qu'**un seul** de ses mandats satisfait le
critère. Les autres mandats restent des réponses valides : quelqu'un qui reconnaît
Gérald Darmanin et répond « budget » a trouvé, même si c'est l'Intérieur qui le fait
entrer en Facile.

Un mandat en cours (`endYear === null`) est toujours postérieur au seuil de 1981. Un
mandat à cheval sur le seuil compte (`endYear >= 1981`) : Raymond Barre, Premier
ministre de 1976 à 1981, entre en Facile.

**Le rang du mandat est ce qui sépare les niveaux.** `Mandate.rank` vaut `ministre`,
`ministre-delegue` ou `secretaire-etat`. Une valeur erronée sortirait silencieusement
une personne d'un niveau : le schéma Zod l'impose et `data.test.ts` le vérifie.

`levels.test.ts` contient l'invariant qui empêche la fonctionnalité de devenir creuse :
sur la base réelle, chaque vivier doit être **strictement plus large** que le
précédent, et chacun doit contenir au moins 10 personnes.

#### Nombre de manches

`roundsForPool(poolSize) = min(ROUNDS_PER_GAME, poolSize)`. Sur un vivier plus petit
que 10, la partie est raccourcie plutôt que de recycler le sac et de montrer deux fois
la même photo.

### 7.8 Score — `game/scoring.ts`

- Nom trouvé : **50 points**. Ministère trouvé : **50 points**.
- Chaque indice utilisé : **−10 points** sur le total de la manche (plancher 0).
- Manche révélée sans réponse : 0 point.
- Bonus de série : +25 points par manche résolue **sans aucun indice**, cumulatif
  au-delà de 2 manches consécutives (garder simple, ajustable).
- Score affiché en continu ; écran de fin avec total, meilleures/pires manches,
  et récapitulatif des personnes vues.

**Persistance** : uniquement `localStorage`, et uniquement le **meilleur score par
niveau** (`quiz-ministres:best-score:<niveau>`). Un score unique n'aurait pas de sens :
les trois viviers n'ont pas la même difficulté.

Rien d'autre n'est stocké. **Aucun cookie**, donc aucune bannière de consentement à
afficher — et c'est un choix d'architecture, pas une facilité. L'exemption de
consentement de l'ePrivacy (art. 5-3) porte sur la finalité, pas sur la technologie :
un score conservé en local, first-party, sans traçage et jamais transmis, y entre.
Toute évolution qui introduirait de l'analytics, un classement en ligne ou un
identifiant de session ferait basculer le site hors de cette exemption.

Les accès à `localStorage` sont enveloppés dans un `try/catch` : en navigation privée
ou stockage refusé, le jeu doit rester jouable.

---

## 8. Interface

### 8.1 Écran de manche

```
┌──────────────────────────────────────────┐
│  Manche 3/10          Score : 180  ⭐×2  │
├──────────────────────────────────────────┤
│                                          │
│            [  PHOTO 400×500  ]           │
│                                          │
├──────────────────────────────────────────┤
│  Qui est-ce ?                            │
│  [ ______________________ ]              │
│  Quel ministère cette personne a-t-elle  │
│  occupé ?                                │
│  [ ______________________ ]              │
│   ↳ suggestions non contraignantes       │
│                                          │
│  [ Valider ]  [ Indice (1/6) ]  [ Passer ]│
├──────────────────────────────────────────┤
│  💡 A exercé dans les années 1990        │
└──────────────────────────────────────────┘
```

### 8.2 Écran de révélation

Nom complet, tous les mandats (intitulé officiel + années), parti, puis crédit et
licence de la photo, et un lien « En savoir plus » vers `sourceUrl`.
Bouton principal : « Personne suivante ».

### 8.3 Règles d'UI

- **Mobile-first.** La photo et le champ de saisie doivent tenir sur un écran de
  téléphone sans scroll.
- Le champ « nom » a le focus au début de chaque manche ; `Entrée` valide.
- Le champ « ministère » propose des suggestions (les `canonicalLabel` filtrés par la
  saisie) mais **n'impose rien** : la validation part toujours du texte saisi, pas
  d'une sélection. Un `<datalist>` natif suffit — pas de librairie d'autocomplétion.
- **Précharger la photo de la manche suivante** (`new Image().src = photoUrl(...)`)
  dès que la manche courante démarre. Ce n'est pas un détail de confort : c'est ce qui
  masque les deux redirections de `Special:FilePath` (§6.3).
- Réserver la place de l'image (`aspect-ratio: 4 / 5`) pour éviter les sauts de mise
  en page pendant le chargement.
- Gérer `onError` sur l'image : si Commons renvoie 404, ne pas afficher de manche
  cassée — journaliser l'`id` en console et enchaîner sur la personne suivante.
- Feedback immédiat et non punitif : bordure verte + coche si correct, secousse
  discrète + message « Pas tout à fait… » si faux. Jamais de son par défaut.
- **Formulation neutre en genre** dans tous les textes d'interface : « cette personne »,
  « qui est-ce ? ». Ne jamais déduire le genre d'un prénom.

### 8.4 Accessibilité

- Chaque `<img>` a un `alt` neutre qui ne divulgue pas la réponse :
  `alt="Portrait de la personne à identifier"`.
- Labels explicites sur les champs, navigation clavier complète, focus visible.
- Contrastes AA minimum. Le vert/rouge est toujours doublé d'une icône ou d'un texte.
- Respecter `prefers-reduced-motion` : pas d'animation si activé.

---

## 9. Tests

Vitest, sur la logique pure uniquement (pas de tests de rendu au début).

Obligatoires :

- `matching.test.ts` : normalisation (accents, casse, tirets, apostrophes), acceptation
  du nom seul, des alias, des fautes de frappe tolérées, **et rejet des noms proches
  mais différents**.
- `portfolios.test.ts` — le plus important après `matching` :
  - cas de référence pour `affaires-etrangeres` : « ministère de l'Europe et des
    Affaires étrangères », « affaires étrangères », « affaires etrangeres »,
    « europe et affaires étrangères », « mae », « meae », « quai d'orsay »,
    « afaires étrangères » (faute) résolvent tous vers le même id ;
  - **invariant anti-collision, calculé sur toute la table** : chaque `alias` et
    chaque `acronym` doit résoudre vers son propre portefeuille et vers aucun autre.
    Ce test échoue automatiquement dès qu'on ajoute une appellation ambiguë — c'est
    le filet de sécurité de la table, il doit exister avant de la remplir ;
  - rejet des sigles approchants : « mea », « maa », « men » ne résolvent pas vers
    `affaires-etrangeres` ;
  - rejet des mots non discriminants isolés : « affaires », « nationale »,
    « ministère » ne résolvent vers rien.
- `deck.test.ts` : aucune répétition dans un même sac, pas de doublon à la jointure
  entre deux sacs, tirage déterministe si on injecte un générateur aléatoire.
- `scoring.test.ts` : points, malus d'indices, plancher à 0, bonus de série.
- `reducer.test.ts` : transitions d'état, indices épuisés → `revealed`, fin de partie.
- `data.test.ts` : `ministers.json` valide le schéma Zod, ids uniques, `credit` et
  `license` non vides, mandats triés et cohérents. **Sans accès réseau** : la
  disponibilité réelle des photos est vérifiée séparément par
  `scripts/check-photo-links.ts`, pour que la suite de tests reste rapide et
  exécutable hors ligne.
- `photoUrl.test.ts` : encodage correct des noms de fichiers contenant espaces,
  parenthèses, apostrophes et accents ; présence systématique du paramètre `width`.

Injecter la source d'aléa (`rng: () => number`) plutôt qu'appeler `Math.random()`
directement, pour que les tests soient déterministes.

---

## 10. Intégration continue

`.github/workflows/ci.yml` tourne sur chaque pull request et sur `main`. Cinq jobs
en parallèle, plus un agrégateur :

| Job        | Commande                                             |
| ---------- | ---------------------------------------------------- |
| **Format** | `npm run format:check`                               |
| **Lint**   | `npm run lint`                                       |
| **Types**  | `npm run typecheck`                                  |
| **Tests**  | `npm run validate` puis `npm test`                   |
| **Build**  | `npm run build`                                      |
| **CI**     | agrège les cinq via `needs`, échoue si l'un a échoué |

**Seul le job `CI` est déclaré « required »** dans les règles de branche de `main` :
une PR dont il échoue n'est pas mergeable. Ajouter un contrôle plus tard ne demande que
de l'ajouter à son `needs`, sans toucher aux réglages du dépôt — un point de couplage en
moins entre le code et la configuration GitHub.

Le job **Format** échoue sans rien réécrire : `--check` se contente de lister les
fichiers fautifs. `npm run format` corrige tout en local.

`npm run verify` rejoue la même séquence en local, sans accès réseau.

### Ce qui n'est volontairement pas un contrôle de PR

`npm run check-links` dépend de Wikimedia. En faire un contrôle bloquant ferait échouer
des merges parfaitement valides au moindre incident réseau ou dépassement de quota. Il
reste hebdomadaire (§6.3).

`deploy.yml` rejoue les mêmes contrôles avant publication. Redondance assumée : `main`
accepte les poussées directes, qui ne passent par aucune PR.

---

## 11. Déploiement — GitHub Pages

1. `vite.config.ts` : `base: '/<nom-du-repo>/'` (indispensable, sinon les assets 404).
2. Repo public sur GitHub, Settings → Pages → Source : **GitHub Actions**.
3. `.github/workflows/deploy.yml` : sur push sur `main` → `install`, `lint`,
   `test`, `validate-data`, `build`, puis `actions/deploy-pages`.
4. URL finale : `https://<user>.github.io/<nom-du-repo>/`.

Le build doit échouer si les tests ou la validation des données échouent.

**Alternatives équivalentes et gratuites** si GitHub Pages pose problème :
Cloudflare Pages (`*.pages.dev`, CDN plus rapide, pas de limite de bande passante),
Netlify (`*.netlify.app`), Vercel (`*.vercel.app`, plan Hobby réservé à un usage non
commercial). Le site étant purement statique, migrer d'un hébergeur à l'autre ne
demande que de changer `base` et le workflow CI.

Rappel de quotas GitHub Pages : 1 Go de site publié, ~100 Go/mois de bande passante.
Les photos étant servies par Wikimedia, le site publié pèse quelques centaines de
kilo-octets : les quotas ne seront jamais un sujet.

---

## 12. Conventions de code

- `strict: true`, `noUncheckedIndexedAccess: true`. Zéro `any`. Les `as` sont à justifier.
- Fonctions pures dans `src/game/**` : aucune référence à React, au DOM, à `Date.now()`
  ou `Math.random()` non injectés. C'est ce qui rend la logique testable.
- Les composants React ne contiennent que du rendu et du branchement d'événements.
- Un seul `useReducer` pour l'état de la partie, dans `App.tsx`. Pas de contexte
  global tant que ce n'est pas nécessaire.
- Commentaires : expliquer **pourquoi**, jamais **quoi**. Écrire un commentaire dès
  qu'une règle métier n'est pas évidente (ex. seuils de Levenshtein).
- Toutes les constantes de gameplay (nombre de manches, points, seuils) regroupées
  dans `src/game/config.ts`, avec un commentaire par valeur.
- Messages de commit en anglais, format conventionnel (`feat:`, `fix:`, `data:`, `chore:`).

---

## 13. Ordre d'implémentation recommandé

1. Init du projet Vite + TS + Vitest + ESLint (npm), CI qui lint, teste et construit.
2. `game/types.ts`, `data/ministers.schema.ts`, `data/ministers.json` avec **10 fiches
   saisies à la main**, puis `game/photoUrl.ts` + son test : vérifier que les 10 photos
   s'affichent bien depuis Commons avant d'aller plus loin.
3. `game/matching.ts` (normalisation + nom) puis `game/portfolios.ts` (table complète
   des appellations) + leurs tests. Ce sont les briques les plus délicates : les
   traiter en premier, et écrire l'invariant anti-collision **avant** de remplir la
   table, pas après.
4. `game/deck.ts`, `game/scoring.ts`, `game/hints.ts` + tests.
5. `game/reducer.ts` + tests : la partie tourne sans interface.
6. Interface : `PhotoCard`, `AnswerForm`, `HintPanel`, `RevealPanel`, `ScoreBar`.
7. Écran de fin de partie + meilleur score en `localStorage`.
8. Page « Crédits » avec toutes les licences des photos.
9. Déploiement GitHub Pages + workflow `check-links`, vérification sur mobile réel.
10. **Puis seulement** : scripts Wikidata / Commons et montée à ~200 fiches.

Ne pas passer à l'étape suivante tant que la précédente n'est pas testée et fonctionnelle.

---

## 14. Licences

| Couche                | Régime                          | Pourquoi                                                                                           |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Code source           | MIT (`LICENSE`)                 | norme de l'écosystème, aucune contrainte imposée aux réutilisateurs                                |
| `data/ministers.json` | MIT, dérivé de Wikidata (CC0)   | la source étant en CC0, aucune obligation n'est héritée ; le droit _sui generis_ ne s'applique pas |
| Photographies         | licence propre à chaque fichier | elles ne sont ni hébergées ni redistribuées ici (§6.3)                                             |

**Le ShareAlike des photos ne contamine pas le code.** Près de la moitié des images sont
en CC BY-SA. Le partage à l'identique ne vise que les œuvres _dérivées_ — les images
modifiées. Afficher une image intacte à côté de son propre contenu constitue une
« collection », que les licences Creative Commons excluent explicitement de cette
obligation. Le fait que les images soient servies par Wikimedia et non par nous rend la
position encore plus nette.

Ce raisonnement tomberait si le projet se mettait à **recadrer, détourer ou retoucher**
les photos : ce seraient alors des œuvres dérivées, et les CC BY-SA imposeraient de
republier le résultat sous la même licence. À garder en tête avant d'ajouter le moindre
traitement d'image.

Le crédit et la licence de chaque photo restent **obligatoires** dans les données et
affichés sur la page « Crédits » : le hotlinking ne dispense d'aucune attribution.

---

## 15. Idées pour plus tard (ne pas implémenter sans demande)

- Mode « chrono » (30 s par manche).
- Mode thématique : un seul portefeuille, ou une seule décennie.
- Mode inverse : on donne le nom, il faut retrouver la photo parmi quatre.
- Partage du score par lien (score encodé dans l'URL, toujours sans backend).
- Bascule en QCM comme indice ultime, après le 6e indice.
