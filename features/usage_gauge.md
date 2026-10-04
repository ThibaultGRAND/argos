# F08 — Jauge de contexte et d'usage

**Statut** : à tester
**Version cible** : V1
**Dépend de** : [session_import.md](session_import.md), [agent_sessions.md](agent_sessions.md)
**Écrans** : barre d'état (maquette globale : « contexte 62 % · 124k / 200k », emplacement réservé),
panneau **F. Fiche** de la session.

## Problème
On ne sait pas quand la conversation approche de la limite de contexte (l'agent va compacter et oublier),
ni où on en est de son abonnement (fenêtre de 5 heures, semaine) avant d'être bloqué.

## Comportement attendu
- **Barre d'état, à droite** :
  - **Contexte** de la session ouverte : petite barre, `13 % · 130 k / 1 M`. Mise à jour en direct pendant un tour.
    **Couleur** : neutre, **ocre** à partir de 50 % (vigilance), **brique** à partir de 80 %. Sans session ouverte ou sans donnée : masqué.
  - **Clic sur la jauge** : fenêtre de détail (modèle, total, seuil du compactage automatique, totaux de la session).
    Pour une session pilotée par Argos : barre empilée et liste par catégorie (instructions système, outils, MCP, fichiers mémoire,
    skills, messages, réserve du compactage, libre) et fichiers mémoire (CLAUDE.md). Pour une session terminée, une phrase explique
    que le découpage n'est visible qu'en direct.
  - **Quota de l'abonnement** : `5 h 16 % · 7 j 14 %`. Info-bulle : utilisation et heure de réinitialisation
    de chaque fenêtre (y compris les fenêtres propres à un modèle). Mêmes couleurs que la jauge.
    Masqué si l'abonnement n'expose pas de limites (clé API) ou si la CLI est absente.
- **Fiche F** : lignes « Contexte » (`130 k / 1 M · 13 %`), « Tokens en entrée » (`12,3 M · cache 97 %`), « Tokens en sortie ».
- Nombres compacts formatés selon la langue.

## Critères d'acceptation
- [x] Le contexte d'une session importée correspond au dernier appel de l'agent (fil principal, hors sous-agents).
- [x] Pendant un tour, la jauge suit l'agent en direct.
- [x] La taille de la fenêtre vient de la CLI (pas devinée) ; inconnue, seule la quantité est affichée.
- [x] Le quota s'affiche et se met à jour (démarrage, retour au premier plan, fin de tour, toutes les 5 min).
- [x] Lire le quota ne consomme rien et ne crée aucune session dans l'historique.
- [x] Les totaux de tokens ne comptent pas deux fois un même appel (une réponse est écrite sur plusieurs lignes JSONL).
- [x] Textes en français et en anglais.

## Conception technique
- **Index (`index.db`)** — nouvelle migration, colonnes de `sessions` :
  `context_tokens` (INTEGER, nul), `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`
  (INTEGER NOT NULL DEFAULT 0), `last_usage_message_id` (TEXT, nul : dédoublonnage des lignes d'une même réponse).
  `parserVersion` de Claude passe à 2 : **réimport complet une fois** (≈ 20 s) pour remplir les anciennes sessions.
- **Événement normalisé `usage-reported`** (PLAN.md §2.2) : identifiant de l'appel, tokens d'entrée, de sortie, de cache, sous-agent ou non.
  Contexte = entrée + cache lu + cache écrit + sortie du dernier appel du fil principal.
- **Direct** : événement `usage` (tokens de contexte, fenêtre si connue) à chaque message de l'agent ;
  la fenêtre exacte vient de `modelUsage.contextWindow` du résultat de fin de tour.
- **Sonde d'usage** (port `UsageProbe`, adaptateur Claude) : un processus CLI sans aucune consigne envoyée, sans réglages
  utilisateur (pas de hooks), dans un dossier temporaire :
  - `getContextUsage` → taille de la fenêtre d'un modèle (mise en cache par modèle) ;
  - API `/usage` du SDK → quota de l'abonnement.
  Les sondes passent une par une. Vérifié : ≈ 0,2 à 0,8 s, aucun JSONL créé, aucun quota consommé.
- **Application** : service d'usage (cache des fenêtres, quota courant, rafraîchissement limité à une fois par minute).
- **Contrat IPC** : `usage.quota` → quota ou `null` ; `usage.contextWindow { model }` → `{ window }` ; événement `usage.quota`.
- **Domaine** : pourcentage, niveaux (vigilance 50 %, alerte 80 %), seuil de compactage, catégories du contexte.
- **Découpage** : `getContextUsage({ detail: 'full' })` sur la session en direct, seulement à l'ouverture du détail
  (≈ 1 s, compté par l'API de comptage des tokens, sans consommer l'abonnement). Le mode « résumé » n'est qu'une estimation
  (messages comptés à 1 token) : écarté. Une session terminée ne peut pas être analysée : la rouvrir écrit dans son JSONL.
- **Couleur ocre** (`--caution`) : reprise de la palette sœur C2, validée par Thibault le 2026-10-04.

## Spécificités par fournisseur
Claude uniquement (capacités `usage.context`, `usage.quota`). Codex et Gemini : jauges masquées jusqu'à F15.

## Risques et questions ouvertes
- **L'API de quota du SDK est expérimentale** (`usage_EXPERIMENTAL…`) : lecture tolérante ; si la forme change,
  le quota est masqué, rien ne plante.
- Une session en mode 1 M lancée hors d'Argos sur un modèle dont la fenêtre par défaut est plus petite :
  si le contexte dépasse la fenêtre connue, on affiche la quantité sans pourcentage.

## Étapes d'implémentation
1. Domaine (usage, quota), événement `usage-reported`, mapper, migration, projection, tests.
2. Sonde d'usage Claude, service, événement en direct, contrat IPC, principal.
3. Interface : barre d'état, fiche F, textes.

## Bilan de l'implémentation (2026-10-04)
- **Sonde vérifiée** : quota lu en ≈ 0,8 s, fenêtre d'un modèle en ≈ 0,2 s, aucune session créée dans l'historique.
  Fenêtres réelles : Opus 5.5 = 1 M, Haiku 4.5 = 200 k (une fenêtre devinée à 200 k aurait été fausse).
- **Dans l'app** : session importée « 246 k / 1 M · 25 % », fiche F (« 199 M (cache 195 M) » en entrée, « 680 k » en sortie),
  quota « 5 h 2 % · 7 j 14 % » avec le détail et les réinitialisations au survol.
- **En direct** (tour Haiku dans `argos-demo`) : jauge mise à jour pendant le tour, taille exacte reçue en fin de tour (32,3 k / 200 k · 16 %).
- Totaux sans double comptage (une réponse = plusieurs lignes JSONL), testés sur un exemple enregistré.
- Réimport complet de l'historique au premier lancement (version du lecteur 2) : ≈ 20 s, une seule fois.
- Le calcul (pourcentage, seuil de 80 %) est fait par le domaine dans le processus principal ; l'interface ne fait qu'afficher.
- Effet de bord du test : une petite session Haiku de plus dans `argos-demo`.

