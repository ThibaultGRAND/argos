# PLAN — agents-cli

> Plan global. Le détail de chaque fonctionnalité est dans `features/<nom_feature>.md`.
> Règles de travail et contraintes : voir [CLAUDE.md](CLAUDE.md).

**Dernière mise à jour** : 2026-10-02

## 1. Vision et contraintes
_À rédiger_ : résumé en quelques lignes + renvoi vers [CLAUDE.md](CLAUDE.md) §1-2.

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
Les versions cibles sont **proposées**, elles seront validées à la section 5.

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
| F14 | Notifications système | V3 | à définir | `features/notifications.md` |
| F15 | Multi-fournisseur complet via ACP (Codex, Gemini) | V3 | à définir | `features/providers.md` |
| F16 | Paramètres de l'app | V0 | à définir | — (une ligne suffit) |

## 5. Roadmap
_À rédiger_ : objectif et périmètre de chaque version.
- **V0 — Lire** : historique, recherche, sans lancer d'agent
- **V1 — Agir** : lancer des sessions, review, snapshots, distribution
- **V2 — Organiser** : plans, profils, blame
- **V3 — Superviser** : vue des agents, notifications, multi-fournisseur complet

## 6. Journal des décisions

| Date | Décision | Alternatives écartées | Raison |
|---|---|---|---|
| 2026-10-01 | Pas d'IDE : boutons « Ouvrir dans VSCode » | Fork de VSCode, éditeur complet intégré | Coût de maintenance démesuré pour un projet perso |
| 2026-10-01 | App de bureau locale, sans serveur, sur les 3 OS | Webapp, backend hébergé | Gratuit, confidentiel, pas d'hébergement |
| 2026-10-01 | Abonnements via les CLI installées | Clés API | Rien de payant, chacun utilise son compte |
| 2026-10-01 | Le cœur (snapshots, blame, plans, profils) est géré par l'app | S'appuyer sur les fonctions de chaque fournisseur | Comportement identique quel que soit l'agent |
| 2026-10-01 | Pas de signature de code payante | Certificats Apple / Windows | Contrainte zéro coût, acceptable entre amis |
