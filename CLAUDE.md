# CLAUDE.md — Argos

Ce fichier définit comment Claude travaille sur ce projet. Il prime sur les habitudes par défaut.
Toute modification de ce fichier doit être validée par Thibault.

---

## 1. Le projet en bref

**Argos** est une application de bureau pour piloter des agents de code IA (Claude Code, Codex, Gemini CLI) :
historique consultable, recherche, review façon PR, plans, profils de pré-prompts, commits d'agent, blame, suivi des agents.

Ce n'est **pas un IDE** : l'édition se fait dans VSCode via des boutons « Ouvrir dans VSCode » (projet, fichier, review).

Usage personnel et partage entre amis. **Jamais vendu.**

### Le nom : Argos
- **Mythe** : Argos Panoptès, le géant aux cent yeux chargé par Héra de surveiller Io. Il ne dormait jamais tout à fait.
- **Pourquoi** : l'app surveille en direct les agents et sous-agents, et garde la mémoire de tout ce qu'ils font.
- **Univers** : il rejoint le panthéon personnel de Thibault (Hermès, son agent assistant messager ; L'Olympe, son wifi).
  Clin d'œil assumé : dans le mythe, Hermès endort et tue Argos (son surnom est Argeiphontès, « le tueur d'Argos »).
- **Icône** : un hexagone isométrique avec un œil.
- **Nom technique** : `argos` (dépôt, binaire, dossiers de configuration), sans accent.
- **Risques connus** : Argos Translate et Argos CI existent, Argo (CD) est très proche, et le nom évoque le panoptique.
  Acceptés pour un projet personnel.

## 2. Contraintes non négociables

- **Vraie app de bureau** sur macOS, Windows et Linux. Pas de webapp.
- **Aucun serveur, aucun hébergement.** Tout tourne sur la machine de l'utilisateur. Le code et les versions sont sur GitHub.
- **Zéro coût** : aucun service payant, aucun certificat de signature payant.
- **Abonnements existants** : l'app lance les CLI installées (`claude`, `codex`, `gemini`), qui gèrent elles-mêmes la connexion.
  L'app ne stocke ni ne manipule jamais d'identifiants ou de tokens.
- **Le cœur est géré par l'app, pas par le fournisseur** : snapshots, blame, plans, profils et historique normalisé
  doivent fonctionner de la même façon quel que soit l'agent.

Toute idée qui viole une de ces contraintes est écartée, ou soumise à Thibault avec la contrainte nommée explicitement.

## 3. Règles de travail

### 3.1 Rien ne se lance sans validation
- Claude **n'exécute rien sans accord explicite** : commandes, installations de dépendances, builds, scripts, commandes git,
  création de projet, génération de code en masse.
- Les actions **en lecture seule** sont autorisées sans demander : lire des fichiers, chercher dans le code, faire des recherches web.
- Écrire un fichier n'est permis que **dans le cadre d'une étape déjà validée**.

### 3.2 Découper et faire valider chaque étape
- Chaque tâche est découpée en étapes courtes, annoncées avant de commencer.
- **Une étape à la fois.** À la fin de chacune : résumé de ce qui a été fait, puis attente de la validation avant la suivante.
- Pas d'enchaînement de plusieurs étapes « pour gagner du temps ».

### 3.3 Demander avant de s'écarter
- Toute déviation de la stack retenue, d'une règle de ce fichier ou d'un plan validé se **demande avant**, jamais après.
- La demande précise ce qui change, pourquoi, et ce que ça coûte.

### 3.4 Réfléchir avant d'agir
- Avant chaque étape non triviale : poser le problème, les options envisagées, la recommandation et sa justification.
- Pas de code « pour voir ». Si quelque chose n'est pas clair, Claude pose la question au lieu de supposer.
- Claude critique les idées, y compris celles de Thibault, quand elles posent problème. Être d'accord n'est pas un objectif.

### 3.5 Rappeler de commiter
- Après chaque modification importante (étape validée, nouveau fichier de plan, changement d'architecture ou de schéma),
  Claude **rappelle à Thibault de commiter** et propose un message de commit.
- Claude ne commite pas lui-même sans qu'on le lui demande.

### 3.6 La maquette globale est la référence visuelle
- La **maquette globale validée** (direction C1, version 2a), déposée dans `maquettes/elements/`, est **la seule référence visuelle** de l'app.
- **On ne refait pas de maquette par fonctionnalité.** Un nouvel écran ou un nouvel élément s'inspire de la maquette globale :
  mêmes tokens (couleurs, typographie, espacements), mêmes composants, même ton.
- Quand un plan de fonctionnalité introduit un écran absent de la maquette, Claude le **décrit dans la section
  « Comportement attendu »** en s'appuyant sur les écrans existants, et le signale à la validation du plan.
- Si un besoin semble **contredire** la maquette globale, Claude s'arrête et demande avant de s'en écarter (§3.3).

## 4. Règles des plans

### 4.1 Structure
```
argos/
├── CLAUDE.md          ← ce fichier
├── PLAN.md            ← plan global : vision, architecture, roadmap, décisions
├── features/
│   └── <nom_feature>.md   ← un plan par fonctionnalité qui le justifie
└── maquettes/
    ├── prompts/       ← description de l'app + un prompt Claude Design par maquette
    │   └── inspirations/  ← images de référence
    └── elements/      ← maquettes finales validées (exports Claude Design)
```

### 4.2 PLAN.md (plan global)
Il contient :
1. Vision et contraintes (résumé, renvoi vers ce fichier)
2. Architecture globale (modules, frontières, flux de données)
3. Stack retenue et justification
4. Liste des fonctionnalités, chacune avec : statut, version cible (V0, V1…) et lien vers `features/<nom_feature>.md` s'il existe
5. Roadmap par version
6. Maquettes : écrans, lien Claude Design, statut
7. Étapes du projet : ordre de travail et avancement
8. **Journal des décisions** : date, décision, alternatives écartées, raison. Une décision validée ne se rediscute pas sans motif nouveau.

PLAN.md reste un **sommaire** : le détail d'une fonctionnalité va dans son fichier, pas dans PLAN.md.

### 4.3 Quand une fonctionnalité a son propre fichier
Elle a un `features/<nom_feature>.md` si au moins un de ces critères est vrai :
- elle touche au schéma de base de données ;
- elle dépend du fournisseur (Claude, Codex, Gemini) ;
- elle demande plus d'une étape d'implémentation ;
- elle comporte un choix d'architecture ou un risque identifié.

Sinon, une ligne dans PLAN.md suffit.

### 4.4 Contenu d'un fichier de fonctionnalité
Nom du fichier en `snake_case`, par exemple `features/agent_blame.md`.

```markdown
# <Nom de la fonctionnalité>

**Statut** : brouillon | validé | en cours | terminé | abandonné
**Version cible** : V0 | V1 | V2 | V3
**Dépend de** : liens vers d'autres features
**Écrans** : écrans de la maquette globale concernés, ou nouveaux écrans décrits dans « Comportement attendu »

## Problème
Ce que ça résout, pour qui.

## Comportement attendu
Ce que voit et fait l'utilisateur.

## Critères d'acceptation
- [ ] Critères vérifiables, un par ligne.

## Conception technique
Modules concernés, flux de données, schéma de base de données, interfaces.

## Spécificités par fournisseur
Claude / Codex / Gemini : ce qui diffère, ce qui manque, le comportement dégradé.

## Risques et questions ouvertes

## Étapes d'implémentation
1. Étape courte et validable séparément.
```

### 4.5 Cycle de vie
- Un plan passe en **validé** uniquement avec l'accord de Thibault. On ne code rien d'une fonctionnalité dont le plan est en brouillon.
- Si l'implémentation révèle que le plan est faux, Claude **s'arrête**, met à jour le plan et le refait valider.
- Les statuts dans PLAN.md et dans les fichiers de fonctionnalités restent synchronisés.

## 5. Exigences d'architecture

### 5.1 Code
- **Couches séparées, dépendances à sens unique** :
  `UI → application (cas d'usage) → domaine ← infrastructure (fournisseurs, base de données, système de fichiers, git)`.
  Le domaine ne dépend de rien d'extérieur.
- **Aucune logique métier dans l'UI.** L'UI affiche et déclenche des cas d'usage, rien de plus.
- **Fournisseurs derrière une interface commune** (`AgentProvider`) : un adaptateur par fournisseur,
  avec des capacités déclarées (checkpoints, sous-agents, contexte…) plutôt que des `if (provider === …)` dispersés.
- **Typage strict** partout. Pas de `any` ni d'équivalent sans justification écrite.
- **Multiplateforme dès la première ligne** : chemins, fins de ligne, lancement de processus, shell. Jamais de chemin Unix codé en dur.
- **Bilingue dès la première ligne (français et anglais)** : aucun texte affiché codé en dur dans l'UI, uniquement des clés de traduction.
  Dates, nombres et durées formatés selon la langue choisie. Les deux langues sont complètes à chaque livraison.
- **Erreurs explicites** : pas d'erreur silencieuse ni de `catch` vide. Les erreurs d'un fournisseur sont converties en erreurs du domaine.
- **Tests** sur le domaine et les cas d'usage au minimum. Les adaptateurs sont testés sur des données enregistrées (exemples de sessions JSONL).
- Pas de dépendance ajoutée sans la nommer et la justifier à Thibault.

### 5.2 Base de données
- **Base locale uniquement : SQLite via better-sqlite3**, dans le dossier de données de l'app propre à chaque OS. Jamais dans les projets.
- **Accès depuis le processus principal uniquement.** L'interface n'y touche jamais : elle passe par des appels IPC typés vers les cas d'usage.
  Les traitements lourds (import des JSONL) tournent dans un worker.
- **Schéma et migrations avec Drizzle** : schéma écrit en TypeScript, migrations générées en fichiers SQL versionnés et ordonnés.
  Jamais de modification manuelle du schéma. **Chaque migration générée est relue avant d'être appliquée.**
  Ce que Drizzle ne modélise pas (tables FTS5, triggers) s'écrit dans une migration SQL dédiée.
- **Copie automatique de la base avant chaque migration.**
- **Schéma normalisé** : clés étrangères déclarées et actives, contraintes `NOT NULL` et `UNIQUE` là où c'est vrai, index justifiés.
- **Conventions de nommage** : tables et colonnes en `snake_case`, tables au pluriel, clé primaire `id`, clés étrangères `<table_singulier>_id`,
  horodatages `created_at` / `updated_at` en UTC ISO 8601.
- **Accès aux données via une couche dédiée** (repositories). Drizzle n'est utilisé que dans cette couche : aucune requête dans l'UI, les stores ni le domaine.
- **Deux types de données, à identifier pour chaque table** (en commentaire du schéma) :
  - **index** (sessions, messages, recherche) : reconstructible en réimportant ; les fichiers sources des fournisseurs ne sont jamais modifiés ;
  - **données propres à Argos** (commentaires de review, liens du blame, réglages, historique des snapshots) : **non reconstructibles**,
    donc protégées par la copie avant migration et jamais supprimées par une réimportation.
- **Plans et profils** : des fichiers dans le repo du projet (versionnés par git), pas des données uniquement en base.
- Tout changement de schéma est décrit dans le fichier de la fonctionnalité concernée **avant** d'écrire la migration.

## 6. Stack

**Validée : Electron + TypeScript partout.** Justification : [PLAN.md](PLAN.md) §3.
- Pas de Rust, pas de Python dans l'app : TypeScript uniquement, en mode strict.
- **Interface : Vue 3 + Vite.** Composants en `<script setup lang="ts">`, état partagé dans des stores Pinia,
  aucune logique métier dans les composants ni dans les stores (ils appellent les cas d'usage).
- **Build et packaging : electron-vite + electron-builder.**
- **Base de données : SQLite (better-sqlite3) + Drizzle ORM** (règles en §5.2).
- **Traductions : vue-i18n**, catalogues `fr.json` / `en.json` partagés avec le processus principal. Clés typées, mêmes clés dans les deux langues.
- **Tests : Vitest** (+ @vue/test-utils), **Playwright** pour le bout en bout à partir de la V1.
- **Outillage : npm, ESLint, Prettier, dependency-cruiser** (le sens des dépendances entre couches est vérifié automatiquement).

Stack complète : [PLAN.md](PLAN.md) §3. Toute bibliothèque supplémentaire est nommée et justifiée avant d'être ajoutée (§5.1).

## 7. Communication
- Réponses en français.
- Concis : ce qui a été fait, ce qui reste, ce qui attend une validation.
- Chaque fin d'étape se termine par une question claire de validation et, si besoin, le rappel de commit.
