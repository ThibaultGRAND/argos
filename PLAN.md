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
_À rédiger après le choix de la stack._
- 2.1 Modules et frontières (UI / application / domaine / infrastructure)
- 2.2 Interface `AgentProvider` et capacités par fournisseur
- 2.3 Flux de données (CLI → import → base locale → UI)
- 2.4 Stockage (base locale, git fantôme, fichiers du projet)

## 3. Stack
**Non décidée.** _À rédiger_ : options, critères, choix, justification.

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

Les maquettes détaillées par fonctionnalité sont ajoutées ici au moment de planifier chaque fonctionnalité.

## 7. Étapes du projet

Une étape à la fois, chacune validée avant la suivante ([CLAUDE.md](CLAUDE.md) §3.2).
Statuts : `à faire` · `en cours` · `terminée`

| # | Étape | Livrable | Statut |
|---|---|---|---|
| 1 | Règles de travail | `CLAUDE.md` | terminée |
| 2 | Squelette du plan global | `PLAN.md` | terminée |
| 3 | Vision et roadmap | PLAN.md §1 et §5 | terminée |
| 4 | **Maquette globale** (Claude Design) | Lien en §6, validé | terminée (export à déposer) |
| 5 | Choix de la stack | PLAN.md §3 + décision au journal | à faire |
| 6 | Architecture globale | PLAN.md §2 | à faire |
| 7 | Par fonctionnalité, dans l'ordre de la roadmap : **maquette détaillée** → plan `features/<nom>.md` (dont le schéma de base de données) → validation → implémentation | Un cycle par fonctionnalité | à faire |

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
