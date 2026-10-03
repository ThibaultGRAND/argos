# F05 — Lancer et piloter une session d'agent

**Statut** : à tester
**Version cible** : V1
**Dépend de** : [session_detail.md](session_detail.md), PLAN.md §2.2 (`AgentRuntime`), §2.3 (flux D)
**Écrans** : zone de saisie en bas du document (maquette 2a : « Écrire la prochaine consigne », sélecteur de modèle, Envoyer ⌘⏎),
badges de statut de la liste et de l'en-tête (En cours, Attend une action), boutons Pause / Arrêter de l'en-tête.
Nouvel élément décrit ci-dessous : **la carte de permission** dans le document.

## Problème
Lancer et relire ses sessions demande aujourd'hui le terminal. La V1 doit permettre de travailler avec l'agent
depuis Argos : écrire une consigne, suivre l'agent en direct, répondre à ses demandes de permission, l'arrêter.

## Comportement attendu
- **Nouvelle session** : « + Nouvelle » (⌘N) ouvre un document vide dans le projet sélectionné, avec la zone de saisie.
- **Continuer une session** : la zone de saisie en bas de chaque compte rendu reprend la session (même conversation).
- **En direct** : le message envoyé apparaît aussitôt, la réponse de l'agent s'écrit au fil de l'eau,
  les appels d'outils apparaissent et se regroupent comme dans l'historique.
- **Statut** visible dans l'en-tête et la liste : `EN COURS`, `ATTEND UNE ACTION` (accent brique), `TERMINÉE`.
  Les onglets « En cours » et « En attente » de la barre latérale comptent enfin quelque chose.
- **Permission** : quand l'agent demande à utiliser un outil, une **carte** s'affiche dans le document
  (« Claude veut modifier src/lib/slugs.ts »), avec **Autoriser**, **Toujours autoriser pour cette session**, **Refuser**.
- **Pause** interrompt le tour en cours ; **Arrêter** termine la session (elle reste dans l'historique).
- **Modèle** : défaut de la CLI, Opus, Sonnet ou Haiku.
- À la fin de chaque tour, l'historique importé prend le relais de l'affichage en direct, sans doublon.
- Les sessions lancées par Argos sont étiquetées **« Claude »** (règle de nommage du SDK) ; celles de la CLI restent « Claude Code ».

## Critères d'acceptation
- [x] Une nouvelle session démarre dans le projet choisi et apparaît dans la liste.
- [ ] Continuer une session existante reprend bien la même conversation.
- [x] Le texte de l'agent s'affiche au fil de l'eau ; les appels d'outils apparaissent en direct.
- [x] Une demande de permission bloque l'agent jusqu'à la réponse ; les trois réponses fonctionnent.
- [ ] Pause interrompt le tour ; Arrêter termine la session ; l'app fermée arrête proprement ses sessions.
- [x] Les statuts et compteurs « En cours » / « En attente » sont justes.
- [x] Après un tour, l'historique remplace l'affichage en direct sans doublon ni trou.
- [ ] L'agent trouve les outils du terminal (`npm`, `git`…) même quand Argos est lancé depuis le Finder.
- [x] Tous les textes en français et en anglais.

## Conception technique
- **Agent SDK** (`@anthropic-ai/claude-agent-sdk`, validé le 2026-10-03), en entrée continue (une session = un processus,
  plusieurs messages), `includePartialMessages` pour le texte au fil de l'eau, `canUseTool` pour les permissions,
  `settingSources` utilisateur/projet/local et préréglage `claude_code` pour garder CLAUDE.md, skills et réglages comme dans la CLI.
- **Exécutable** : la CLI `claude` installée (recherchée dans le PATH du shell et les emplacements usuels) ;
  à défaut, celui fourni par le SDK.
- **Environnement** : variables du shell de connexion chargées au démarrage (macOS, Linux) pour que l'agent trouve ses outils.
- Domaine : événements en direct normalisés (`live-events`), port `AgentRuntime` / `LiveRun` (PLAN.md §2.2).
- Application : service des sessions en direct (registre, démarrage, reprise, envoi, pause, arrêt, permissions).
- Infrastructure : adaptateur Claude sur le SDK ; la conversion des blocs de message est **partagée avec l'import** (même format).
- Principal : relais des événements vers l'interface, import incrémental demandé à chaque fin de tour, arrêt des sessions à la fermeture.
- **Aucune table nouvelle** : les sessions lancées sont écrites par la CLI dans ses JSONL, l'indexeur les importe (règle PLAN.md §2.3).
- Contrat IPC : `live.start`, `live.continue`, `live.send`, `live.interrupt`, `live.stop`, `live.answer`, `live.list`, `sessions.findByExternal` ;
  événement `live.event`.

## Spécificités par fournisseur
Claude uniquement (capacités `runtime.launch`, `runtime.resume`, `runtime.interrupt`, `runtime.permissions`, `runtime.modelSelection`).

## Risques et questions ouvertes
- Packaging : le binaire du SDK (≈ 230 Mo) ne doit pas être embarqué dans l'app ; à exclure dans F09.
- Profils de consignes (puces sous la zone de saisie) : F11.
- Snapshots à chaque fin de tour : F06.

## Étapes d'implémentation
1. Domaine (événements en direct, port), conversion des blocs partagée, service des sessions et tests.
2. Adaptateur SDK, exécutable, environnement du shell.
3. Contrat IPC et relais dans le principal.
4. Interface : zone de saisie, affichage en direct, carte de permission, statuts, nouvelle session.

## Bilan de l'implémentation (2026-10-03)
- **Test réel automatisé** (optionnel, consomme un peu de quota) : `ARGOS_SMOKE=1 npx vitest run claude-agent-runtime.smoke`.
  Vérifié : identification, texte au fil de l'eau, appel d'outil, 1 demande de permission passée par Argos, fichier écrit, fin du tour.
- **Parcours complet vérifié dans l'app** (projet jetable `argos-demo`) : nouvelle session, carte de permission, badge
  « Attend une action » et compteur « En attente 1 », autorisation, fichier créé, bascule automatique vers le compte rendu,
  panneau D à jour, aucun doublon entre direct et historique.
- La CLI installée est utilisée (`~/.local/bin/claude`) ; l'environnement du shell est chargé au démarrage.
- **Doublons évités** : pendant un tour, l'historique est figé et coupé au début de ce que le direct affiche ;
  le direct d'un tour s'efface quand l'historique importé l'a rattrapé.
- Non vérifié par Claude : « Continuer une session existante » (même mécanisme `resume`, à tester par Thibault),
  Pause pendant un long tour, arrêt des sessions à la fermeture de l'app.
- **Limite connue** : les sessions lancées par Argos s'affichent « Claude Code » une fois importées
  (le fichier de la CLI ne distingue pas encore l'origine dans notre import) ; à corriger avec l'origine de la session (`entrypoint`).
- Effet de bord des tests : 5 petites sessions de test dans l'historique Claude Code (dossiers temporaires et `argos-demo`).
