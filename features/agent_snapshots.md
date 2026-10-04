# F06 — Snapshots d'agent et retour en arrière

**Statut** : terminé (refonte du 2026-10-04 : [agent_changes.md](agent_changes.md))
**Version cible** : V1
**Dépend de** : [agent_sessions.md](agent_sessions.md), PLAN.md §2.4 (git fantôme)
**Écrans** : panneau **E. Snapshots** et repères « SNAPSHOT S1 · ↺ revenir » dans le document (maquette 2a)

## Refonte du 2026-10-04
Le comportement visible est remplacé par [agent_changes.md](agent_changes.md) ; ce fichier garde la conception d'origine.

## Problème
Un agent peut modifier des dizaines de fichiers en un tour. Sans moyen fiable de revenir en arrière, on hésite à le laisser
travailler, ou on découvre trop tard une modification non voulue. Promesse d'Argos : « je peux tout annuler ».

## Comportement attendu (première version)
- Pour chaque session pilotée par Argos :
  - **S0** au démarrage (état du projet avant que l'agent n'agisse) ;
  - **S1, S2…** à chaque fin de tour.
- Panneau **E. Snapshots** : la liste de la session (numéro, heure, fichiers modifiés depuis le précédent, +/−),
  avec **« ↺ revenir »** sur chacun.
- Dans le document, un repère **« SNAPSHOT S2 »** marque la fin de chaque tour.
- **Revenir à S2** : confirmation (« Les fichiers du projet reviendront à leur état de 14:14 »), puis :
  1. Argos prend d'abord un snapshot de l'état actuel (« avant retour ») : **le retour en arrière est lui-même annulable** ;
  2. les fichiers modifiés reviennent à leur contenu de S2, les fichiers créés depuis sont supprimés,
     les fichiers supprimés depuis sont recréés.
- Refusé pendant qu'un agent travaille dans ce projet (il écrirait en même temps).
- Git absent : le panneau l'indique, les sessions fonctionnent normalement sans snapshot.

## Critères d'acceptation
- [x] S0 puis un snapshot par fin de tour, pour les sessions nouvelles comme reprises.
- [x] Revenir à un snapshot restaure exactement les fichiers (modifiés, créés, supprimés), y compris les fichiers non suivis par le git du projet.
- [x] Le `.git` du projet n'est jamais touché ; les fichiers ignorés par le projet (`.gitignore`) et `node_modules` ne sont ni capturés ni modifiés.
- [x] Le snapshot « avant retour » permet d'annuler le retour.
- [x] Un retour est refusé pendant qu'un agent travaille dans le projet.
- [x] Les snapshots survivent à une reconstruction de l'index (données propres à Argos).
- [x] Textes en français et en anglais.

## Conception technique

### Git fantôme (PLAN.md §2.4)
- Un dépôt par projet : `<données d'Argos>/shadow-git/<clé>.git`, clé = 16 premiers caractères du SHA-256 du chemin du projet.
- `git --git-dir=<fantôme>` avec `core.worktree=<projet>` : le `.git` du projet n'est jamais lu ni écrit.
- Réglages : `core.autocrlf=false` (fichiers capturés à l'identique), identité « Argos », signature désactivée.
- Exclusions : `.gitignore` du projet (lu par git), plus `info/exclude` d'Argos (`node_modules/`, `dist/`, `out/`, `build/`,
  `.next/`, `coverage/`, `.DS_Store`…), plus les fichiers de plus de 5 Mo.
- Snapshot = `git add -A` puis commit (même sans changement), statistiques par `git diff --numstat` avec le précédent.
- Retour = snapshot « avant retour », suppression des fichiers ajoutés depuis la cible, puis `git restore --source=<cible> --worktree`.
- Le git du système, lancé avec l'environnement du shell ; détecté au démarrage.

### Schéma de `argos.db` (nouvelle migration)
Table **`snapshots`** (donnée propre à Argos, clé `TEXT` UUID) : `project_path`, `provider_id`, `session_external_id`,
`ordinal` (S0, S1…), `kind` (`baseline` | `turn` | `before_restore`), `commit_hash`, `parent_commit_hash`,
`files_changed`, `lines_added`, `lines_removed`, `created_at`. Index sur (`provider_id`, `session_external_id`).
Référence à la session par sa **clé naturelle** (CLAUDE.md §5.2), jamais par l'`id` de l'index.

### Couches
- Domaine : snapshot, règles (numérotation, refus pendant une session active). Ports `ShadowRepository`, `SnapshotRepository`.
- Application : service des snapshots (S0 au démarrage, snapshot de fin de tour, liste, retour).
- Infrastructure : git fantôme (git du système), dépôt SQLite des snapshots.
- Contrat IPC : `snapshots.list` `{ sessionExternalId }` → `{ available, snapshots }`, `snapshots.restore` `{ snapshotId }` ; événement `snapshots.updated`.

## Spécificités par fournisseur
Aucune : les snapshots reposent sur les fichiers du projet et la fin de tour normalisée (`turn-completed`).

## Risques et questions ouvertes
- Taille du dépôt fantôme sur un gros projet : `git gc` automatique ; politique de rétention à définir si besoin.
- Sessions lancées hors d'Argos (terminal) : pas de snapshot, faute de fin de tour connue en direct.

## Étapes d'implémentation
1. Domaine, ports, migration `snapshots`, dépôt SQLite.
2. Git fantôme et tests sur de vrais dépôts temporaires (créations, modifications, suppressions, exclusions).
3. Service et branchement sur les sessions en direct.
4. Panneau E, repères dans le document, confirmation du retour.

## Bilan de l'implémentation (2026-10-03)
- **Git fantôme testé sur de vrais dépôts temporaires** : fichiers modifiés, créés et supprimés restaurés exactement ;
  `.git` du projet intact (zéro commit, HEAD inchangé) ; `.gitignore`, `node_modules` et gros fichiers ni capturés ni modifiés ;
  retour annulable.
- **Parcours réel dans l'app** (projet `argos-demo`) : S0 au démarrage du tour, S1 en fin de tour (1 fichier, +1),
  retour à S0 (fichier identique octet pour octet à l'avant-tour), puis retour à S2 « avant retour » (modification de l'agent retrouvée).
- Copie automatique de `argos.db` avant la migration `snapshots` vérifiée (`backups/`).
- Document : seuls les snapshots de fin de tour sont jalonnés ; S0 et « avant retour » restent dans le panneau E.
- Snapshot S0 pris avant le démarrage de l'agent (le démarrage attend le snapshot, quelques dizaines de millisecondes).
