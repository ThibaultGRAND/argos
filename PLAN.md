# PLAN — Argos

> Plan global. Le détail de chaque fonctionnalité est dans `features/<nom_feature>.md`.
> Règles de travail et contraintes : voir [CLAUDE.md](CLAUDE.md).

**Dernière mise à jour** : 2026-10-02

## 1. Vision et contraintes

> Statut : **validé** (2026-10-02).

### 1.0 Le nom
**Argos**, d'après Argos Panoptès, le géant aux cent yeux qui veillait sans relâche.
L'app surveille les agents et garde la mémoire de leur travail. Détails et risques : [CLAUDE.md](CLAUDE.md) §1.

### 1.1 Le problème
Travailler au quotidien avec des agents de code (Claude Code, Codex, Gemini CLI), c'est aujourd'hui :
- des conversations **mal rangées par projet**, difficiles à retrouver, **sans recherche** ;
- des changements faits par l'agent **difficiles à relire** et à annuler proprement ;
- **aucune vue** sur ce que font les agents, avec quel modèle et à quel coût en contexte ;
- des consignes récurrentes (« fais un plan avec une roadmap… ») à **retaper à chaque fois** ;
- des outils existants (Claude Desktop, chat VSCode, Nimbalyst) inconfortables, instables ou trop limités.

### 1.2 La promesse
> **Un poste de pilotage local pour mes agents de code** : je retrouve tout, je relis tout, je peux tout annuler,
> et je sais toujours ce que font mes agents — quel que soit le fournisseur.

### 1.3 Pour qui
Thibault d'abord, puis quelques amis développeurs qui utilisent les mêmes outils. Pas de public plus large visé.

### 1.4 Principes produit
1. **Centré sur l'agent, pas sur l'éditeur** : on relit et on pilote ici, on édite dans VSCode.
2. **L'app possède le cœur** : historique, snapshots, blame, plans et profils fonctionnent pareil avec tous les fournisseurs.
3. **Tout est traçable** : chaque changement relie un fichier, une session, un plan et un snapshot.
4. **Rien n'est irréversible** : tout changement d'agent peut être annulé.
5. **Interface dense et pilotable au clavier** : palette de commandes, panneaux modulaires qu'on peut masquer.
6. **Ne dérange que quand c'est utile** : on ne notifie que si un agent attend une action.

### 1.5 Hors périmètre (volontairement)
- Un IDE ou un éditeur de code complet
- Un serveur, une synchronisation entre machines, une app mobile
- L'utilisation de clés API ou la gestion d'identifiants
- La vente, la monétisation ou une offre en équipe

Contraintes détaillées : [CLAUDE.md](CLAUDE.md) §1-2.

## 2. Architecture globale

### 2.1 Couches, processus et arborescence

> Statut : **brouillon**, en attente de validation.

#### Les processus Electron

```
┌──────────────────────────── Processus principal (main) ────────────────────────────┐
│  Cycle de vie, fenêtres, menus, notifications                                       │
│  Gestionnaires IPC  ──►  cas d'usage (application)  ──►  ports (domaine)             │
│                                                          ▲                          │
│  Racine de composition : branche les adaptateurs ────────┘                          │
│  Adaptateurs : base SQLite, fournisseurs (CLI), git fantôme, système de fichiers…   │
└──────────▲──────────────────────────────────────────────────────▲──────────────────┘
           │ IPC typé (contrat partagé)                            │ messages typés
┌──────────┴───────────┐                              ┌────────────┴─────────────────┐
│  Preload             │                              │  Indexeur (utilityProcess)   │
│  expose window.argos │                              │  lecture des JSONL, import   │
│  (contextBridge)     │                              │  et indexation en base       │
└──────────▲───────────┘                              └──────────────────────────────┘
           │ API typée, aucun accès à Node
┌──────────┴───────────────────────────────────────────┐
│  Interface (renderer) : Vue 3, Pinia, vue-i18n         │
└───────────────────────────────────────────────────────┘
```

| Processus | Rôle | A le droit de |
|---|---|---|
| **Principal** | Orchestration : fenêtres, IPC, cas d'usage, lancement des CLI, git, notifications | Tout (Node, Electron, base, système) |
| **Indexeur** | Travaux lourds : lire des milliers de JSONL, importer et indexer sans bloquer l'app | Base et système de fichiers, sans Electron |
| **Preload** | Pont unique entre l'interface et le principal | Seulement exposer l'API typée `window.argos` |
| **Interface** | Afficher et déclencher des cas d'usage | Seulement appeler `window.argos` : ni Node, ni base, ni système |

**Sécurité de la fenêtre** : `contextIsolation` et `sandbox` activés, `nodeIntegration` désactivé, CSP stricte,
aucun contenu distant (polices embarquées), validation des données reçues par IPC côté principal.

**Base partagée par deux processus** : SQLite en mode WAL. L'indexeur écrit les données importées,
le principal lit et écrit les données propres à Argos. Un seul écrivain à la fois, géré par SQLite (délai d'attente configuré).

#### Les couches

| Couche | Contient | Peut importer |
|---|---|---|
| `shared` | Contrat IPC (canaux, DTO, événements), catalogues de traduction, types utilitaires | Rien |
| `core/domain` | Entités, objets valeur, erreurs du domaine, **ports** (interfaces : repositories, `AgentProvider`, git, fichiers, horloge…) | Rien |
| `core/application` | Cas d'usage (un fichier par cas : `ImportSessions`, `SearchMessages`, `GetSessionDetail`…), DTO d'entrée et de sortie | `core/domain` |
| `infrastructure` | Adaptateurs qui implémentent les ports : base (schéma Drizzle, migrations, repositories), fournisseurs, git, fichiers, éditeur, chemins par OS | `core/domain` |
| `main` | Racine de composition, gestionnaires IPC, fenêtres, menus, notifications Electron | `core`, `infrastructure`, `shared` |
| `indexer` | Point d'entrée du processus d'indexation | `core`, `infrastructure`, `shared` |
| `preload` | Exposition de l'API typée | `shared` |
| `renderer` | Application Vue | `shared` |

**Règles clés :**
- **L'interface ne voit jamais le domaine** : elle ne connaît que les DTO du contrat (`shared`). On peut faire évoluer le domaine sans casser l'interface.
- **Les adaptateurs n'importent pas les cas d'usage** : ils implémentent seulement des ports.
- **Injection de dépendances manuelle** dans la racine de composition : pas de conteneur ni de bibliothèque.
- Ces règles sont **vérifiées par dependency-cruiser** dans le lint et dans GitHub Actions.

#### Arborescence `src/`

```
src/
├── shared/
│   ├── contract/          ← canaux IPC, DTO, événements (une partie par domaine fonctionnel)
│   └── i18n/              ← fr.json, en.json, types des clés
├── core/
│   ├── domain/
│   │   ├── <module>/      ← entités, objets valeur, erreurs (project, session, snapshot…)
│   │   └── ports/         ← interfaces implémentées par l'infrastructure
│   └── application/
│       └── <module>/      ← cas d'usage
├── infrastructure/
│   ├── database/          ← schema/, migrations/, repositories/
│   ├── providers/
│   │   └── claude/        ← adaptateur Claude Code (seul adaptateur avant la V3)
│   ├── git/               ← git fantôme (V1)
│   ├── filesystem/
│   ├── editor/            ← ouverture dans VSCode
│   └── system/            ← chemins par OS, lancement de processus
├── main/
│   ├── index.ts
│   ├── composition.ts     ← racine de composition
│   ├── ipc/               ← un gestionnaire par partie du contrat
│   └── windows/, menus/, notifications/
├── indexer/
│   └── index.ts
├── preload/
│   └── index.ts
└── renderer/
    ├── main.ts, App.vue
    ├── ui/                ← composants de base de la maquette C1 (filets, entrées, badges, terminal…) et tokens CSS
    ├── features/
    │   └── <fonctionnalité>/  ← écrans, composants et store Pinia de la fonctionnalité
    ├── layouts/           ← structure 2a : barre latérale, document, colonne D/E/F, barre d'état
    └── i18n/
tests/
└── fixtures/              ← JSONL enregistrés pour tester les adaptateurs
```

Les tests unitaires sont placés à côté du code testé (`*.test.ts`), les données de test dans `tests/fixtures/`.

**Bibliothèque pressentie, à valider :** Vue Router (navigation entre les écrans, en mode hash pour fonctionner sans serveur).

### 2.2 Interface `AgentProvider` et capacités par fournisseur
_À rédiger (étape 6.2)._
- 2.3 Flux de données (CLI → import → base locale → UI)
- 2.4 Stockage (base locale, git fantôme, fichiers du projet)

## 3. Stack

> Statut : **validé** (2026-10-02). Stack complète.

### 3.1 Socle : Electron + TypeScript partout
**Pourquoi :**
- **Une seule langue** (TypeScript) pour l'interface, le cœur, les adaptateurs et les tests : tout le code reste lisible et maintenable par Thibault.
- **Rendu identique sur macOS, Windows et Linux** grâce à Chromium embarqué : indispensable pour la direction C1 (typographie, filets de 1 px, alignements).
- **Claude Agent SDK et ACP utilisables directement** en TypeScript.
- Écosystème éprouvé pour ce type d'app (VSCode, Nimbalyst, Slack).

**Écarté : Tauri 2**, qui impose Rust pour le cœur et dont le rendu varie selon le moteur web de chaque OS (surtout WebKitGTK sur Linux).

**Compromis acceptés :**
- App plus lourde (environ 100 à 150 Mo) et plus gourmande en mémoire.
- **Sur macOS, pas de mise à jour automatique** sans signature Apple payante : l'app détecte la nouvelle version et ouvre la page de la GitHub Release.
  Windows et Linux peuvent se mettre à jour automatiquement (détails dans F09).
- Sans signature, le premier lancement sur macOS passe par clic droit > Ouvrir (ou `xattr -cr`), à documenter dans le README.

### 3.2 Framework d'interface : Vue 3 + Vite
**Pourquoi :**
- Composants `.vue` (template, script, style dans un fichier) proches d'Astro, que Thibault connaît déjà.
- Écosystème mûr et stable pour une application : **Pinia** (état partagé), **Reka UI** (composants accessibles),
  **VueUse** (utilitaires), **vue-i18n** (français / anglais), TanStack Virtual (longues conversations).
- Conventions claires (stores Pinia) qui servent la séparation UI / cas d'usage exigée par CLAUDE.md §5.1.
- Intégration native avec Vite.

**Écartés :** Astro (fait pour des sites de contenu, pas pour une app entièrement interactive),
Svelte 5 (écosystème plus jeune, encore en adaptation après les runes), React (plus verbeux, plus loin d'Astro).

Les bibliothèques citées sont pressenties : chacune sera confirmée au moment de son ajout (CLAUDE.md §5.1).

### 3.3 Build et packaging : electron-vite + electron-builder
- **electron-vite** : développement et compilation (Vite, rechargement à chaud, Vue pris en charge nativement).
- **electron-builder** : installateurs des 3 OS (`.dmg` macOS, `.exe` NSIS Windows, AppImage et `.deb` Linux),
  publication sur GitHub Releases, mises à jour via electron-updater (sauf macOS, voir §3.1).
- Builds produits gratuitement par GitHub Actions sur les 3 OS (détails dans F09).

**Écarté :** Electron Forge (intégration de Vite moins mûre, publication et mises à jour plus lourdes à configurer).

### 3.4 Base de données : SQLite (better-sqlite3) + Drizzle ORM
- **better-sqlite3** : le moteur SQLite le plus rapide et le plus éprouvé dans Electron, avec FTS5 pour la recherche plein texte.
- **Drizzle ORM** : schéma en TypeScript, requêtes typées, migrations générées en fichiers SQL relus avant application.
- Base dans le processus principal, accès via IPC typé, import lourd dans un worker, copie avant chaque migration.
- **Deux types de données** : l'index (reconstructible) et les données propres à Argos (non reconstructibles, protégées).
  Règles complètes : [CLAUDE.md](CLAUDE.md) §5.2.

**Écartés :** `node:sqlite` (expérimental), sql.js (base en mémoire, inadaptée), Kysely (migrations entièrement manuelles),
SQL brut (pas de typage).

### 3.5 Traductions : vue-i18n
- Catalogues partagés `fr.json` / `en.json`, utilisés par vue-i18n dans l'interface et par `@intlify/core` dans le processus principal
  (notifications, menus natifs, boîtes de dialogue).
- Clés typées : une clé inexistante fait échouer la compilation.
- Un test vérifie que les deux langues ont exactement les mêmes clés.

### 3.6 Tests : Vitest, puis Playwright
- **Vitest** : domaine, cas d'usage, adaptateurs (sur des JSONL enregistrés).
- **@vue/test-utils** : composants ayant un vrai comportement.
- **Playwright** (Electron) : tests de bout en bout, **à partir de la V1**.

### 3.7 Outillage
- **npm** comme gestionnaire de paquets (pas de friction avec electron-builder et les modules natifs).
- **ESLint** (typescript-eslint, eslint-plugin-vue) et **Prettier**.
- **dependency-cruiser** : vérifie automatiquement le sens des dépendances entre les couches (CLAUDE.md §5.1).
- Pas de hook git avant commit : lint, tests et vérification d'architecture tournent dans GitHub Actions.

**Écartés :** pnpm (frictions avec electron-builder), Biome (support incomplet des templates Vue), hooks git avant commit.

## 4. Fonctionnalités

Statuts : `à définir` · `brouillon` · `validé` · `en cours` · `terminé` · `abandonné`
Les versions cibles sont **validées** (voir §5).

| # | Fonctionnalité | Version | Statut | Plan détaillé |
|---|---|---|---|---|
| F01 | Import des sessions (Claude, puis Codex, Gemini) | V0 | à définir | `features/session_import.md` |
| F02 | Navigateur d'historique par projet | V0 | à définir | `features/history_browser.md` |
| F03 | Recherche plein texte | V0 | à définir | `features/full_text_search.md` |
| F04 | Ouvrir dans VSCode (projet, fichier, review) | V0 | à définir | — (une ligne suffit) |
| F05 | Lancer et piloter une session d'agent | V1 | à définir | `features/agent_sessions.md` |
| F06 | Snapshots d'agent et retour arrière (git fantôme) | V1 | à définir | `features/agent_snapshots.md` |
| F07 | Review façon PR | V1 | à définir | `features/pr_review.md` |
| F08 | Jauge de contexte et d'usage | V1 | à définir | `features/usage_gauge.md` |
| F09 | Distribution (builds 3 OS, GitHub Releases, mises à jour) | V1 | à définir | `features/distribution.md` |
| F10 | Plan mode amélioré (plans comme objets, plan vs réalité) | V2 | à définir | `features/plan_mode.md` |
| F11 | Profils de pré-prompts | V2 | à définir | `features/profiles.md` |
| F12 | Blame par agent | V2 | à définir | `features/agent_blame.md` |
| F13 | Vue d'activité des agents | V3 | à définir | `features/agent_activity.md` |
| F14 | Notifications système (minimale en V1, complète en V3) | V1 / V3 | à définir | `features/notifications.md` |
| F15 | Multi-fournisseur complet via ACP (Codex, Gemini) | V3 | à définir | `features/providers.md` |
| F16 | Paramètres de l'app, dont la langue (choisie au premier lancement, modifiable ensuite) | V0 | à définir | — (une ligne suffit) |

## 5. Roadmap

> Statut : **validé** (2026-10-02). Une version n'est commencée que lorsque la précédente est terminée.

### V0 — Lire
**Objectif** : remplacer le `/resume` et la navigation à l'aveugle. Je retrouve n'importe quelle conversation passée.

**Fonctionnalités** : F01 (import Claude uniquement), F02, F03, F04, F16

**Terminée quand** :
- toutes mes sessions Claude Code apparaissent, rangées par projet ;
- je retrouve une conversation par un mot qu'elle contient, en moins de 2 secondes ;
- j'ouvre un projet ou un fichier dans VSCode en un clic ;
- l'app tourne sur macOS, et se lance sur Windows et Linux en mode développement.

**Pas dans V0** : lancer un agent, modifier quoi que ce soit dans les projets.

**Pourquoi d'abord** : lecture seule, donc sans risque. Valide l'interface, l'import et la base de données sur de vraies données.

### V1 — Agir
**Objectif** : lancer et relire mes sessions dans l'app au lieu du terminal.

**Fonctionnalités** : F05 (Claude uniquement), F06, F07, F08, F09, F14 (version minimale)

**Terminée quand** :
- je lance, reprends et arrête une session Claude Code depuis l'app ;
- chaque tour d'agent crée un snapshot, et j'annule n'importe quel tour ;
- je relis les changements comme une PR et je renvoie mes commentaires à l'agent ;
- je vois le contexte utilisé et la consommation de quota ;
- je suis notifié quand un agent attend une permission ou a terminé ;
- un ami installe l'app depuis une GitHub Release sur son OS.

### V2 — Organiser
**Objectif** : structurer le travail avec des plans et des consignes réutilisables.

**Fonctionnalités** : F10, F11, F12

**Terminée quand** :
- les plans sont des objets de l'app, liés à leurs sessions, avec la comparaison entre plan et réalité ;
- je choisis un profil (mode, pré-prompt, modèle, permissions) au lancement d'une session ;
- pour une ligne de code, je retrouve la session et le snapshot qui l'ont produite.

### V3 — Superviser
**Objectif** : piloter plusieurs agents et plusieurs fournisseurs.

**Fonctionnalités** : F13, F14 (complet), F15

**Terminée quand** :
- je vois en direct l'arbre des agents et sous-agents : modèle, outil en cours, durée, statut ;
- je lance et j'importe des sessions Codex et Gemini, avec les mêmes snapshots, blame, plans et profils.

### Ajustements validés par rapport au squelette
- **F14 Notifications avancée en V1 (version minimale)** : dès qu'on lance des sessions depuis l'app, il faut savoir quand un agent attend.
  Sans ça, la V1 est pénible à utiliser. La version complète (réglages, regroupement, sons) reste en V3.
- **F01 et F05 limitées à Claude en V0 et V1** : l'interface `AgentProvider` est posée dès le début,
  mais un seul adaptateur est écrit avant la V3. C'est ce qui garantit que l'architecture multi-fournisseur est réelle, sans tripler le travail tout de suite.

## 6. Maquettes

Réalisées dans Claude Design. Règle : [CLAUDE.md](CLAUDE.md) §3.6.
Statuts : `à faire` · `en cours` · `validée`

Organisation du dossier `maquettes/` :
- `prompts/00_description_app.md` : contexte de l'app, joint à chaque prompt
- `prompts/NN_<nom>.md` : un prompt Claude Design par maquette
- `elements/` : les maquettes finales validées

| Maquette | Périmètre | Prompt | Lien | Statut |
|---|---|---|---|---|
| Direction visuelle | Un écran en 3 propositions, pour choisir l'UI et les thèmes de couleur | [01_direction_visuelle.md](maquettes/prompts/01_direction_visuelle.md), puis [01b_direction_visuelle_iteration_c.md](maquettes/prompts/01b_direction_visuelle_iteration_c.md) → **C1 · Compte rendu imprimé** retenue | [Claude Design](https://claude.ai/design/p/8950cdd9-37c5-43e9-a846-97db93f52b8c?file=Directions+visuelles.dc.html) | validée |
| Globale | Structure de l'app, navigation, écrans principaux de la V0 | [02_maquette_globale.md](maquettes/prompts/02_maquette_globale.md) → **version 2a** retenue | [Claude Design](https://claude.ai/design/p/8950cdd9-37c5-43e9-a846-97db93f52b8c) | validée — export à déposer dans `maquettes/elements/` |

Pas de maquette par fonctionnalité : la maquette globale est la référence, les nouveaux écrans s'en inspirent ([CLAUDE.md](CLAUDE.md) §3.6).

## 7. Étapes du projet

Une étape à la fois, chacune validée avant la suivante ([CLAUDE.md](CLAUDE.md) §3.2).
Statuts : `à faire` · `en cours` · `terminée`

| # | Étape | Livrable | Statut |
|---|---|---|---|
| 1 | Règles de travail | `CLAUDE.md` | terminée |
| 2 | Squelette du plan global | `PLAN.md` | terminée |
| 3 | Vision et roadmap | PLAN.md §1 et §5 | terminée |
| 4 | **Maquette globale** (Claude Design) | Lien en §6, validé | terminée (export à déposer) |
| 5 | Choix de la stack | PLAN.md §3 + décision au journal | terminée |
| 6 | Architecture globale | PLAN.md §2 | en cours (6.1) |
| 7 | Par fonctionnalité, dans l'ordre de la roadmap : plan `features/<nom>.md` (écrans inspirés de la maquette globale, schéma de base de données) → validation → implémentation | Un cycle par fonctionnalité | à faire |

Aucun code avant la fin de l'étape 6 et la validation du plan de la première fonctionnalité.

## 8. Journal des décisions

| Date | Décision | Alternatives écartées | Raison |
|---|---|---|---|
| 2026-10-01 | Pas d'IDE : boutons « Ouvrir dans VSCode » | Fork de VSCode, éditeur complet intégré | Coût de maintenance démesuré pour un projet perso |
| 2026-10-01 | App de bureau locale, sans serveur, sur les 3 OS | Webapp, backend hébergé | Gratuit, confidentiel, pas d'hébergement |
| 2026-10-01 | Abonnements via les CLI installées | Clés API | Rien de payant, chacun utilise son compte |
| 2026-10-01 | Le cœur (snapshots, blame, plans, profils) est géré par l'app | S'appuyer sur les fonctions de chaque fournisseur | Comportement identique quel que soit l'agent |
| 2026-10-01 | Pas de signature de code payante | Certificats Apple / Windows | Contrainte zéro coût, acceptable entre amis |
| 2026-10-02 | Maquette avant toute conception : globale d'abord, puis par fonctionnalité | Concevoir la base de données et le code directement ; tout maquetter d'un coup | Les écrans révèlent les données nécessaires ; les écrans des versions lointaines changeront |
| 2026-10-02 | Notifications minimales (agent en attente, terminé) dès la V1, complètes en V3 | Tout en V3 | Indispensable dès qu'on lance des sessions depuis l'app |
| 2026-10-02 | Un seul adaptateur (Claude) jusqu'à la V3, interface `AgentProvider` posée dès la V0 | Les trois fournisseurs dès la V0 ; import Codex/Gemini en V1 | Valide l'architecture multi-fournisseur sans tripler le travail au départ |
| 2026-10-02 | Nom de l'app : **Argos** (`argos` en technique) | Ariane, Mnémosyne, Delphes, Héphaïstos et les autres candidats du prompt de nommage | Argos Panoptès surveille sans relâche, comme l'app surveille les agents. Le contresens avec Hermès (son tueur dans le mythe) et les homonymes (Argos Translate, Argos CI, Argo) sont acceptés |
| 2026-10-02 | Direction visuelle **C1 · Compte rendu imprimé** ; maquette globale **2a** | Directions A (monochrome pur), B (monochrome + accent), C2 (poste de contrôle dense) | Esprit de document technique imprimé, ne ressemble ni à un IDE ni à une interface IA générique |
| 2026-10-02 | Interface bilingue français / anglais, langue choisie au premier lancement et modifiable dans les paramètres | Français seul ; anglais seul | Usage perso en français, partage possible avec des amis non francophones |
| 2026-10-02 | Dossier et dépôt renommés `argos` | Garder `agents-cli` | Cohérence avec le nom de l'app |
| 2026-10-02 | Socle technique : **Electron + TypeScript partout** | Tauri 2 (Rust), Python (PyQt ou équivalent) | Une seule langue maîtrisée, rendu identique sur les 3 OS, Agent SDK et ACP natifs en TypeScript |
| 2026-10-02 | Framework d'interface : **Vue 3 + Vite** | Astro, Svelte 5, React | Proche d'Astro, écosystème mûr pour une app (Pinia, Reka UI, vue-i18n), conventions claires |
| 2026-10-02 | Build et packaging : **electron-vite + electron-builder** | Electron Forge | Duo éprouvé pour Vue + Vite, publication GitHub Releases et mises à jour intégrées |
| 2026-10-02 | Base de données : **SQLite (better-sqlite3) + Drizzle ORM** | `node:sqlite`, sql.js, Kysely, SQL brut | Rapide, éprouvé, FTS5, schéma typé, migrations SQL versionnées et relues |
| 2026-10-02 | Distinction **index reconstructible / données propres à Argos**, copie de la base avant chaque migration | Tout considérer comme un index | Commentaires de review, blame et réglages ne peuvent pas être réimportés |
| 2026-10-02 | Traductions **vue-i18n** (catalogues partagés avec le processus principal), tests **Vitest** puis **Playwright** en V1, outillage **npm + ESLint + Prettier + dependency-cruiser** | i18next, Jest, pnpm, Biome, hooks git | Standards de l'écosystème Vue ; architecture vérifiée automatiquement |
| 2026-10-02 | Plus de maquette par fonctionnalité : la maquette globale (C1, 2a) est la seule référence visuelle | Une maquette détaillée par fonctionnalité | Le design global suffit ; les nouveaux écrans s'en inspirent |
