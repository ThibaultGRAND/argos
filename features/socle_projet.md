# Étape 0 — Socle du projet

**Statut** : brouillon
**Version cible** : avant V0
**Dépend de** : PLAN.md §2 (architecture) et §3 (stack)
**Écrans** : coquille de la maquette globale 2a, sans contenu fonctionnel

## Problème
Avant de coder une fonctionnalité, il faut un projet qui démarre, respecte l'architecture validée et vérifie automatiquement
ses propres règles. Sans ce socle, chaque fonctionnalité réinventerait l'outillage et l'architecture dériverait dès la première.

## Comportement attendu
- `npm run dev` ouvre une fenêtre Argos avec la **coquille de l'interface 2a en direction C1** :
  barre latérale, zone du document, colonne de droite (D. Fichiers, E. Snapshots, F. Fiche), barre d'état. Les zones sont vides ou avec un état vide.
- **Thème sombre par défaut**, bascule vers le thème clair.
- **Français par défaut**, bascule vers l'anglais. Le choix au premier lancement complet est livré avec F16.
- La barre d'état affiche la **version de l'app obtenue par IPC** : preuve que la chaîne interface → preload → principal → cas d'usage → `Result` fonctionne.
- Au démarrage, `index.db` et `argos.db` sont créés dans le dossier de données de l'app, migrations appliquées.
- L'indexeur démarre et répond à un message de test : preuve de la chaîne principal ↔ indexeur.

## Critères d'acceptation
- [ ] `npm run dev` lance l'app sur macOS avec la coquille C1, en sombre et en clair, en français et en anglais.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test` et `npm run check:architecture` passent sans erreur.
- [ ] dependency-cruiser **échoue** si on ajoute volontairement un import interdit (vérifié une fois, puis retiré).
- [ ] Le test de parité des traductions échoue si une clé manque dans une langue.
- [ ] La version de l'app s'affiche dans la barre d'état via IPC.
- [ ] Les deux bases sont créées au bon endroit, une copie de `argos.db` est faite avant migration.
- [ ] L'indexeur répond au message de test.
- [ ] `npm run build:mac` produit une app qui se lance.
- [ ] GitHub Actions exécute typecheck, lint, tests et architecture sur macOS, Windows et Linux.
- [ ] La fenêtre respecte la sécurité définie (isolation, sandbox, CSP, aucun contenu distant).

## Conception technique

### Versions
- **Node 24** (installé : 24.19), fixé par `.nvmrc` et `engines`.
- **Electron** : dernière version stable au moment de l'installation.
- Toutes les dépendances en versions exactes dans `package-lock.json`.

### Dépendances du socle
| Paquet | Rôle | Validé dans |
|---|---|---|
| `electron`, `electron-vite`, `electron-builder` | App, dev et build, packaging | PLAN §3.1, §3.3 |
| `vite`, `@vitejs/plugin-vue`, `vue`, `vue-tsc`, `typescript` | Interface et typage | PLAN §3.2 |
| `pinia`, `vue-router` | État et navigation | PLAN §3.2, §2.1 |
| `vue-i18n`, `@intlify/core` | Traductions | PLAN §3.5 |
| `zod` | Contrat IPC | PLAN §2.3 |
| `better-sqlite3`, `drizzle-orm`, `drizzle-kit` | Bases et migrations | PLAN §3.4 |
| `vitest`, `@vue/test-utils` | Tests | PLAN §3.6 |
| `eslint`, `typescript-eslint`, `eslint-plugin-vue`, `eslint-config-prettier`, `prettier` | Lint et format | PLAN §3.7 |
| `dependency-cruiser` | Vérification de l'architecture | PLAN §3.7 |
| **`@fontsource/schibsted-grotesk`, `@fontsource/ibm-plex-mono`** | **Polices C1 embarquées** (licence OFL), sans appel à Internet | **Nouveau, à valider** |

Les modèles d'electron-vite ajoutent `@electron-toolkit/*` : **retirés** sauf si l'un d'eux évite du code réellement utile.
Reka UI, VueUse et TanStack Virtual arriveront avec les fonctionnalités qui en ont besoin.

### Arborescence créée
Celle de PLAN.md §2.1, avec des dossiers vides marqués par un fichier `README.md` d'une ligne expliquant leur rôle.
Alias TypeScript : `@shared`, `@core`, `@infrastructure`, `@main`, `@renderer`.

### Contrat IPC minimal
- Requête `app.info` → `{ version, platform, locale }`.
- Événement `indexer.status` → `{ state: 'starting' | 'ready' | 'error' }`.
- Génération de `window.argos` à partir du contrat, `Result` pour chaque réponse, validation Zod côté principal.

### Bases
- Infrastructure de migrations pour `index.db` et `argos.db` (deux séries, deux configurations drizzle-kit).
- **Une seule table dans le socle : `settings`** dans `argos.db` (`key` TEXT clé primaire, `value` TEXT JSON validé par Zod, `updated_at`).
  Elle sert à mémoriser le thème et la langue. Les tables de l'index arrivent avec F01.
- Mode WAL, clés étrangères activées, délai d'attente configuré, copie de `argos.db` avant migration (5 dernières conservées).

### Interface
- Tokens C1 en variables CSS (`--bg`, `--raised`, `--rule`, `--tx`, `--acc`…), sombre et clair, depuis `00_description_app.md`.
- Composants de base dans `renderer/ui/` : filet, repère monospace (« D. Fichiers »), badge de statut, bouton à contour.
- Mise en page 2a dans `renderer/layouts/`.

### Scripts npm
`dev`, `build`, `build:mac`, `build:win`, `build:linux`, `typecheck`, `lint`, `format`, `test`,
`check:architecture`, `db:generate` (génère une migration à relire), `verify` (enchaîne typecheck, lint, tests et architecture).

### GitHub Actions
Un workflow `ci.yml` : `npm ci` puis `npm run verify` sur macOS, Windows et Linux. Les releases viendront avec F09.

## Risques et questions ouvertes
- **better-sqlite3 est un module natif** : il doit être recompilé pour la version d'Electron (`electron-builder install-app-deps`).
  À vérifier sur les 3 OS dans la CI.
- **dependency-cruiser et les fichiers `.vue`** : la configuration doit analyser les imports des composants. À vérifier dès l'étape 0.2.
- Le choix de la langue au premier lancement est livré avec F16, pas dans le socle.

## Étapes d'implémentation
1. **0.1 Projet et outillage** : création avec electron-vite (Vue + TypeScript), nettoyage du modèle, TypeScript strict, ESLint, Prettier, Vitest, scripts.
2. **0.2 Squelette d'architecture** : arborescence §2.1, alias, règles dependency-cruiser, test volontaire d'un import interdit.
3. **0.3 IPC et indexeur** : contrat Zod, `Result`, preload généré, `app.info`, indexeur et `indexer.status`, sécurité de la fenêtre.
4. **0.4 Bases** : deux bases, migrations, table `settings`, copie avant migration.
5. **0.5 Coquille d'interface** : tokens C1, polices, thème, traductions FR/EN et test de parité, mise en page 2a, Pinia, Vue Router.
6. **0.6 CI et build** : workflow GitHub Actions, configuration electron-builder, `build:mac` vérifié.

Après la 0.6 : **test utilisateur par Thibault**, puis passage à F01.
