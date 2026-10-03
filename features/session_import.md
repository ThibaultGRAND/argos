# F01 — Import des sessions

**Statut** : terminé
**Version cible** : V0
**Dépend de** : [socle_projet.md](socle_projet.md), PLAN.md §2.2 (ports), §2.3 (flux A), §2.4 (index.db)
**Écrans** : barre latérale de la maquette 2a (sélecteur de projet, liste des sessions), barre d'état (progression de l'import)

## Problème
Retrouver ses sessions Claude Code oblige aujourd'hui à faire `/resume` projet par projet. Argos doit tout importer
automatiquement, ranger par projet et se mettre à jour quand une session avance dans un terminal.

## Comportement attendu
- Au démarrage, l'indexeur importe toutes les sessions de `~/.claude/projects` (ou de `CLAUDE_CONFIG_DIR`).
  La barre d'état affiche la progression (« Import 40 / 127 »), puis « Indexeur : prêt ».
- La barre latérale affiche un **sélecteur de projet** (nom, chemin, nombre de sessions), le plus récent sélectionné par défaut.
- La liste montre les sessions du projet, les plus récentes en haut : date, titre, extrait du dernier message de l'agent,
  « Claude Code · Opus 5.5 », nombre de fichiers modifiés. Le champ de filtre filtre par titre.
- Une session qui avance dans un terminal se met à jour dans Argos en quelques secondes, sans relancer l'app.
- Le détail d'une session (le document) arrive avec F02.

## Critères d'acceptation
- [x] Toutes les sessions Claude Code de la machine apparaissent, rangées par projet (chemin réel tiré de `cwd`).
- [x] Titre : titre personnalisé, sinon titre automatique, sinon début du premier message, sinon « Session sans titre ».
- [x] Fichiers modifiés et lignes ajoutées / supprimées comptés à partir des modifications réelles (Edit, Write).
- [x] Réimporter ne crée aucun doublon ; une session modifiée n'est relue qu'à partir de là où la lecture s'était arrêtée.
- [x] Une ligne illisible ou un type d'événement inconnu n'arrête pas l'import.
- [x] Une nouvelle session ou un nouveau message dans un terminal apparaît sans relancer l'app.
- [x] Les fichiers de Claude Code ne sont jamais modifiés.
- [x] Les textes de l'interface existent en français et en anglais.

## Conception technique

### Domaine (`core/domain/history/`)
Événements normalisés (PLAN.md §2.2) : `SessionObserved`, `TitleChanged`, `UserMessage`, `AssistantMessage`, `ToolCall`, `ToolResult`.
Règles métier pures : résolution du titre, type normalisé des outils. Ports : `HistorySource` (lecture), `HistoryIndex` (écriture),
`SessionQueries` (lecture pour l'interface).

### Adaptateur Claude (`infrastructure/providers/claude/`)
- `discover()` : liste les `*.jsonl` de premier niveau de chaque dossier projet (taille, date de modification).
- `read(fichier, position)` : lit **par octets** à partir de la dernière position, ne traite que les lignes complètes,
  et renvoie les événements normalisés et la nouvelle position.
- Conversion :
  - `user` avec du texte → `UserMessage`. Sont ignorés : `isMeta`, les résultats d'outils, `<local-command-…>`, `<system-reminder>`, `<task-notification>`.
    `<command-name>` devient « /commande arguments ».
  - `assistant` : bloc `text` → `AssistantMessage` ; bloc `tool_use` → `ToolCall` ; les blocs `thinking` sont ignorés.
  - `toolUseResult` avec `structuredPatch` ou une création de fichier → `ToolResult` avec les fichiers modifiés (+/−).
  - `custom-title`, `ai-title` → `TitleChanged`.
  - Tout autre type est ignoré et compté.
- Types d'outils : Read → `read` ; Edit, MultiEdit, NotebookEdit → `edit` ; Write → `write` ; Bash → `command` ;
  Grep, Glob, ToolSearch → `search` ; WebFetch, WebSearch → `web` ; Agent, Task → `subagent` ; le reste → `other`.

### Schéma de `index.db` (première migration)
| Table | Colonnes principales | Contraintes |
|---|---|---|
| `projects` | `path`, `name` | `path` unique |
| `sessions` | `provider_id`, `external_id`, `project_id`, `custom_title`, `ai_title`, `first_prompt`, `last_excerpt`, `model`, `git_branch`, `cli_version`, `started_at`, `last_activity_at`, `message_count`, `tool_call_count`, `files_changed`, `lines_added`, `lines_removed` | unique (`provider_id`, `external_id`) ; index (`project_id`, `last_activity_at`) |
| `messages` | `session_id`, `external_id`, `seq`, `role`, `text`, `occurred_at` | unique (`session_id`, `seq`) ; suppression en cascade |
| `tool_calls` | `session_id`, `external_id`, `seq`, `tool_name`, `kind`, `target`, `summary`, `status`, `occurred_at` | unique (`session_id`, `external_id`) ; cascade |
| `file_changes` | `tool_call_id`, `path`, `lines_added`, `lines_removed` | cascade ; index sur `path` (pour le blame) |
| `import_cursors` | `provider_id`, `source_path`, `session_external_id`, `byte_offset`, `file_size`, `next_seq`, `parser_version` | `source_path` unique |

Tables en `INTEGER` auto-incrémenté, horodatages `created_at` / `updated_at` ; l'heure des événements est dans `occurred_at` / `started_at`.
`messages` et `tool_calls` partagent la même numérotation `seq` : F02 les affiche dans l'ordre.
La table FTS5 de la recherche arrive avec F03.

### Flux
- L'indexeur applique les migrations de `index.db`, importe tout, puis **surveille** le dossier (`fs.watch`, anti-rebond de 1,5 s)
  et refait un passage incrémental toutes les 5 minutes.
- Fichier plus petit que la position enregistrée, ou version du lecteur changée : la session est **réimportée entièrement**.
- Une transaction par fichier : la position est enregistrée avec les données, jamais l'une sans l'autre.
- L'indexeur signale la progression et les sessions modifiées ; le principal relaie `indexer.status` et `index.updated`.
- Le principal lit `index.db` en **lecture seule**.

### Contrat IPC
- `projects.list` → projets avec nombre de sessions et dernière activité.
- `sessions.list` `{ projectId, query? }` → sessions résumées (100 au plus pour l'instant ; pagination avec F02).
- Événement `index.updated` ; `indexer.status` gagne l'état `importing` et la progression.

## Spécificités par fournisseur
Claude uniquement en V0. Les transcriptions des **sous-agents** (`<session>/subagents/`) ne sont pas importées : elles arriveront
avec l'arbre des sous-agents (F13). Codex et Gemini : F15.

## Risques et questions ouvertes
- Le format JSONL de Claude Code change sans prévenir : lecture tolérante, données de test par version.
- Les statuts « En cours » et « En attente » restent à 0 en V0 : Argos ne pilote pas encore de session (F05).
- Les espaces de travail temporaires de Claude Desktop apparaissent comme des projets ; un filtre viendra si c'est gênant.

## Étapes d'implémentation
1. Domaine et ports, adaptateur Claude avec tests sur des JSONL de test.
2. Schéma et migration de `index.db`, écriture de l'index, tests.
3. Indexeur : import, surveillance, progression.
4. Lecture côté principal, contrat IPC, barre latérale.

## Bilan de l'implémentation (2026-10-03)
- Import complet sur la machine de Thibault : 127 fichiers (383 Mo) en environ 3 secondes, 0 échec ;
  25 projets, 125 sessions, 5 319 messages, 10 840 appels d'outils, 651 modifications de fichiers.
  2 fichiers sans aucun `cwd` (aucun message) ne créent pas de session.
- Mise à jour en direct vérifiée : une session en cours est réimportée quelques secondes après chaque écriture.
- Lignes ignorées (≈ 35 000) : types internes de Claude Code (pièces jointes, modes, coûts, historique de fichiers…), attendu.
- Tests : adaptateur Claude sur un JSONL synthétique, lecteur par octets, import de bout en bout sur une vraie base SQLite.
