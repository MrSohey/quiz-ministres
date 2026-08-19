# Quiz des ministres de la Ve République

Un jeu web : une photo, deux questions — le nom de la personne et un ministère
qu'elle a occupé depuis 1958. Six indices sont disponibles à la demande, chacun coûte
des points.

Trois niveaux, gigognes :

| Niveau        | Périmètre                                          | Vivier        |
| ------------- | -------------------------------------------------- | ------------- |
| Facile        | Postes régaliens depuis 1981                       | 83 personnes  |
| Intermédiaire | Tous les ministères depuis 1958                    | 175 personnes |
| Difficile     | Y compris ministres délégués et secrétaires d'État | 206 personnes |

Le meilleur score est conservé séparément pour chaque niveau, dans `localStorage`.
Aucun cookie, donc aucune bannière de consentement.

**Défi partageable.** En fin de partie, un lien rejoue exactement la même partie —
mêmes personnes, même ordre — pour comparer les scores à armes égales. Tout tient
dans l'URL, il n'y a rien à héberger :

```
…/quiz-ministres/?defi=intermediaire.uuhy9b.13q47wh
```

Une graine fige le tirage mais pas les données : si la base a changé depuis la
création du défi, le jeu le signale plutôt que de promettre à tort une partie
identique.

Site statique, sans backend, sans compte, sans tracking. Les photos sont servies
directement par Wikimedia Commons.

**`CLAUDE.md` est la référence du projet** : décisions d'architecture, règles de
données, algorithme de matching, obligations de licence. À lire avant toute
modification.

## Installation

```bash
npm install
npm run dev          # http://localhost:5173
```

Node 24 ou plus.

## Commandes

| Commande              | Effet                                                          |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | serveur de développement                                       |
| `npm run verify`      | **lint + types + données + tests** — à lancer avant de pousser |
| `npm run lint`        | ESLint (`--fix` avec `npm run lint:fix`)                       |
| `npm run typecheck`   | vérification TypeScript                                        |
| `npm run validate`    | valide `data/ministers.json` contre le schéma Zod              |
| `npm test`            | tests unitaires (aucun accès réseau)                           |
| `npm run check-links` | vérifie que chaque photo répond encore sur Commons             |
| `npm run build`       | valide, typecheck puis construit `dist/`                       |

`npm run verify` reproduit exactement ce que la CI exécute sur une PR, en local et
sans accès réseau. Si le job **Format** échoue, `npm run format` règle tout : il
n'y a jamais rien à corriger à la main.

Prettier met en forme, ESLint corrige : aucune règle de style n'est écrite dans
`eslint.config.js`, les deux outils ne se marchent pas dessus.

## Ajouter une personne à la base

Tout se joue dans `data/ministers.json`, qui est fait pour être édité à la main.

1. **Trouver une photo réutilisable sur Wikimedia Commons.** La licence doit être
   domaine public, CC0, CC BY, CC BY-SA ou Licence Ouverte / Etalab. Les mentions
   « fair use » ou « usage éditorial » sont à refuser : dans le doute, on n'ajoute
   pas la personne.

2. **Relever crédit et licence :**

   ```bash
   npx tsx scripts/fetch-photo-metadata.ts "Nom du fichier.jpg"
   ```

3. **Ajouter la fiche**, en reprenant la structure d'une entrée existante. Points de
   vigilance :
   - `commonsFile` est le nom du fichier **sans** le préfixe `File:` ;
   - `portfolio` doit être l'un des identifiants de `src/game/types.ts`, pas un
     intitulé libre ;
   - `rank` vaut `ministre`, `ministre-delegue` ou `secretaire-etat`. **C'est lui qui
     décide des niveaux** : un ministre marqué `secretaire-etat` disparaîtrait des
     niveaux Facile et Intermédiaire sans que rien ne le signale ;
   - `officialTitle` reprend le `holderLabel` du portefeuille pour un ministre de
     plein exercice, et l'intitulé précis pour un délégué ou un secrétaire d'État ;
   - les mandats sont triés par année de début croissante ;
   - `sourceUrl` est obligatoire : aucune donnée non vérifiable n'entre en base ;
   - `party` et `politicalFamily` acceptent `null` — c'est le cas d'une vingtaine de
     ministres de la société civile qui n'ont réellement pas d'étiquette. Les indices
     correspondants sont alors escamotés. Pour compléter une fiche, remplacez les deux
     `null` d'un coup : le schéma refuse une famille renseignée sans parti, et une
     chaîne vide.

4. **Vérifier :**

   ```bash
   npm run validate && npm run check-links && npm test
   ```

Pour repérer des candidats en masse :
`npx tsx scripts/fetch-candidates.ts > data/candidates.raw.json`. Ce script ne
réécrit jamais la base : le tri reste manuel, il demande des jugements (notoriété,
famille de portefeuille, difficulté) qu'aucune requête ne sait rendre.

## Ajouter une appellation de ministère

Les formes acceptées pour chaque ministère vivent dans `src/game/portfolios.ts`. Les
sigles vont dans `acronyms`, tout le reste dans `aliases`. La distinction compte :
les sigles sont comparés en égalité stricte, car sur trois lettres une tolérance
d'un caractère rendrait `mae`, `maa` et `men` équivalents.

Un test vérifie que chaque appellation résout vers un seul portefeuille. Si vous
ajoutez un alias ambigu, la suite échoue en vous disant lequel.

## Modifier les niveaux

Tout est dans `src/game/levels.ts` : la liste des postes régaliens, l'année seuil du
niveau Facile, et le critère de chaque niveau. `levels.test.ts` vérifie sur la base
réelle que les viviers restent gigognes, strictement croissants, et qu'aucun ne
descend sous 10 personnes — en dessous, une partie recyclerait les photos.

## Contribuer

Une pull request doit passer `.github/workflows/ci.yml`, qui exécute cinq contrôles
en parallèle :

| Job        | Commande                           | Ce qu'il attrape                                               |
| ---------- | ---------------------------------- | -------------------------------------------------------------- |
| **Format** | `npm run format:check`             | mise en forme non conforme à Prettier                          |
| **Lint**   | `npm run lint`                     | bugs de hooks React, `any`, promesses non attendues, code mort |
| **Types**  | `npm run typecheck`                | erreurs TypeScript en mode strict                              |
| **Tests**  | `npm run validate` puis `npm test` | données invalides, régressions de logique                      |
| **Build**  | `npm run build`                    | ce qui ne casse qu'à la compilation de production              |

Un dernier job, **CI**, ne fait qu'agréger les précédents. C'est le seul déclaré
« required » sur `main` : une PR dont il échoue n'est pas mergeable. Ajouter un contrôle
plus tard ne demande que de l'ajouter à son `needs`, sans retoucher la configuration du
dépôt.

`npm run check-links` n'est **pas** un contrôle de PR, délibérément : il dépend de la
disponibilité de Wikimedia et bloquerait des merges légitimes lors d'un incident
réseau. Il tourne une fois par semaine (`check-links.yml`).

## Déploiement

Pousser sur `main` déclenche `.github/workflows/deploy.yml`, qui relance les mêmes
contrôles que la CI puis publie sur GitHub Pages. Cette redondance est voulue :
`main` accepte les poussées directes, qui ne passent par aucune PR. Dans les réglages du dépôt, mettre
**Settings → Pages → Source : GitHub Actions**, et ajuster `REPOSITORY_NAME` dans
`vite.config.ts` si le dépôt ne s'appelle pas `quiz-ministres`.

Un second workflow vérifie chaque lundi que les photos répondent toujours sur
Commons, et ouvre une issue si l'une d'elles a disparu.

## Licences

Trois couches, trois régimes distincts.

**Le code et la base de données** sont sous [licence MIT](LICENSE). `data/ministers.json`
dérive de Wikidata, publié en CC0 : aucune obligation n'en découle, et le droit _sui
generis_ des bases de données ne s'y applique pas.

**Les photographies ne sont pas couvertes par cette licence.** Elles appartiennent à
leurs auteurs, ne sont pas hébergées dans ce dépôt, et sont affichées depuis Wikimedia
Commons selon les termes de chaque fichier. La page « Crédits » du jeu les liste toutes
avec leur auteur, leur licence et un lien vers le fichier source.

Répartition actuelle sur 206 photos : 98 en partage à l'identique (CC BY-SA), 56 en
attribution simple (CC BY), 36 libres de droits (domaine public, CC0), 16 sous licences
institutionnelles (Attribution, Licence Ouverte / Etalab).

**Le partage à l'identique ne contamine pas le code.** Le ShareAlike de Creative Commons
ne s'applique qu'aux œuvres _dérivées_, c'est-à-dire aux images modifiées. Afficher une
image intacte à côté de son propre contenu constitue une « collection », explicitement
exclue de cette obligation — a fortiori quand l'image n'est même pas redistribuée.

Toute contribution ajoutant une photo doit respecter les règles du README ci-dessus :
licence de réutilisation explicite, crédit et licence renseignés. Une image en « fair
use » ou sans licence claire n'entre pas dans la base.
