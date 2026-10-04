# F06 + F07 (refonte) — Modifications de l'agent : review et annulation

**Statut** : terminé (validé par Thibault le 2026-10-04)
**Version cible** : V1
**Remplace** : le comportement visible de [agent_snapshots.md](agent_snapshots.md) (F06) et de [pr_review.md](pr_review.md) (F07).
Le git fantôme, les commentaires de review et l'envoi à l'agent sont conservés.
**Dépend de** : [agent_sessions.md](agent_sessions.md) ; prépare F10 (plans) ; F17 pourra déplacer les panneaux sans changer ce modèle.
**Écrans** : compte rendu (lignes de tour), panneau **D. Modifications**, onglet **Review** (refondu). Le panneau E disparaît.

## Problème
La première version exposait la mécanique : un snapshot par message, S0 → S2, un panneau E surchargé.
Elle pensait en **tours**, alors que l'utilisateur pense en **tâches**. Elle ne répondait pas aux deux vraies questions :
« qu'est-ce que l'agent a changé ? » et « comment j'annule ? ». Résultat : la review et les retours en arrière étaient
plus pénibles qu'avant (retour de Thibault, 2026-10-04).

## Parcours à servir
1. **Relire une tâche** : après plusieurs tours et relances, une review façon PR de tout ce que l'agent a changé dans la session.
2. **Itérer** : après mes commentaires, voir seulement ce qui est nouveau depuis ma dernière review.
3. **Rattraper une erreur** : annuler un fichier, un tour ou toute la session, et pouvoir annuler cette annulation.
4. **Distinguer** ce qu'a fait l'agent de ce que j'ai modifié moi-même (VSCode) entre deux tours.
5. (F10, plus tard) **Suivre un plan** : ce que chaque étape a modifié, revenir avant une étape.

## Principes
- **Le mot « snapshot » disparaît de l'interface.** On parle de modifications, de tours et de reviews.
  Les captures (git fantôme) sont un mécanisme interne et invisible.
- **Seuls les repères qui ont un sens sont affichés** : début de session, tours qui ont modifié des fichiers, dernière review
  (plus tard, étapes d'un plan).
- **La référence est le début de la session** (décision du 2026-10-04 ; la comparaison au dernier commit git est écartée).
- **Tout retour en arrière est annulable**, et refusé pendant qu'un agent travaille dans le projet.

## Comportement attendu

### Compte rendu
- Sous chaque tour **qui a modifié des fichiers**, une ligne discrète (mono, `--tx3`) :
  `3 fichiers modifiés · +12 −4 · Revoir · Revenir avant ce tour`.
  - **Revoir** ouvre l'onglet Review sur ce tour.
  - **Revenir avant ce tour** demande confirmation : « Les fichiers reviendront à leur état d'avant « Corrige le 404… ».
    Les modifications des tours suivants seront aussi retirées. Tu pourras annuler ce retour. »
- Un tour sans modification n'affiche rien.

### Panneau D. Modifications (session pilotée par Argos)
- **Retour annulable** : si le dernier geste est un retour, un bandeau `Retour effectué · Annuler le retour` en tête du panneau.
- **Travail de l'agent** : fichiers modifiés depuis le début de la session et qui diffèrent encore aujourd'hui.
  Chaque ligne : statut (A, M, D, R), chemin relatif, +/−.
  - Clic sur la ligne : ouvre son diff dans la review.
  - Au survol : **Annuler ce fichier** (avec confirmation) et **Ouvrir dans l'éditeur**.
  - Un fichier aussi modifié hors de l'agent porte une mention discrète : « modifié aussi hors de l'agent ».
- **Autres modifications · 2** (repliée) : fichiers modifiés pendant la session, mais **hors des tours de l'agent**
  (toi entre deux tours, ou une autre session).
- **Pied du panneau** : `Revoir tout` · `Tout annuler` (avec confirmation : retour à l'état d'avant la session).
- **Session lancée hors d'Argos** : la liste actuelle, tirée de l'historique de l'agent, avec la mention « D'après l'historique de l'agent ».
  Aucune annulation n'est possible, faute de capture.

### Onglet Review
- **Plage** (liste en tête) :
  - **Toute la session** (par défaut) ;
  - **Depuis ma dernière review**, proposée seulement s'il y a du nouveau, avec le nombre de tours nouveaux ;
  - **Un tour** : « 14:02 · Corrige le 404… ».
- **Sommaire** : la liste cliquable des fichiers avec leur +/−, puis les diffs.
- **Chaque fichier** :
  - en-tête : statut, chemin, +/−, **Ouvrir dans l'éditeur**, **Annuler ce fichier** ;
  - le fichier est repliable ;
  - « Annuler ce fichier » remet le fichier dans son état **au début de la plage affichée**, et la confirmation le dit.
- **Commentaires de ligne** et **Envoyer à l'agent** : comme aujourd'hui.
- **Barre du bas** : `3 commentaires · Envoyer à l'agent` et **Marquer comme relu**. L'envoi des commentaires marque aussi comme relu.
- **Autres modifications** : section repliée en fin de review, avec leurs diffs, sans commentaires.

## Critères d'acceptation
- [x] Aucun tour sans modification n'apparaît (ni ligne, ni choix de plage).
- [x] Modifier un fichier à la main entre deux tours le range dans « Autres modifications », pas dans le travail de l'agent.
- [x] Annuler un fichier, un tour, toute la session : les fichiers sont exactement restaurés (créés, modifiés, supprimés),
      et « Annuler le retour » remet tout comme avant.
- [x] « Depuis ma dernière review » ne montre que les tours postérieurs au dernier « Marquer comme relu » ou envoi de commentaires.
- [x] Toute annulation est refusée pendant qu'un agent travaille dans le projet, avec un message clair.
- [x] Les sessions lancées hors d'Argos gardent leur liste de fichiers, sans bouton d'annulation.
- [x] Les captures existantes (avant la refonte) restent lisibles ; leurs tours sans modification sont ignorés.
- [x] Aucun texte « snapshot » ni « S0 » dans l'interface ; textes en français et en anglais.

## Conception technique

### Captures (git fantôme inchangé)
Quatre sortes de captures, une capture n'étant **enregistrée que si l'état a changé** depuis la précédente du projet :
- `baseline` : avant la première consigne de chaque lancement (une session reprise en a une par lancement) ;
- `prompt` : **avant chaque consigne suivante**. Ce qui a changé entre la fin du tour précédent et cette capture est fait hors de l'agent ;
- `turn` : fin de tour, avec le début de la consigne comme libellé ;
- `before_restore` : capture de sécurité avant un retour.

### Attribution (domaine, fonctions pures testées)
- **Travail d'un tour** = capture de début de tour (`baseline` ou `prompt`) → capture `turn`.
- **Autres modifications** = capture `turn` précédente → capture `prompt` suivante.
- **Fichiers de l'agent** = réunion des fichiers des tours. La review de la session compare le début de session au dernier tour,
  restreinte aux fichiers de l'agent. Les autres fichiers modifiés vont dans « Autres modifications ».
  Un fichier touché des deux côtés reste chez l'agent, avec la mention « modifié aussi hors de l'agent ».
- **Depuis ma dernière review** : dernière capture relue → dernier tour, même restriction.
- **Limite assumée** : une modification faite à la main *pendant* qu'un tour tourne est attribuée à l'agent.

### Annulations
- **Fichier** : `git restore --source=<capture> -- <chemin>`, ou suppression si le fichier n'existait pas dans la capture.
- **Tour** : retour du projet à la capture de début de ce tour.
- **Session** : retour à la première capture.
- Chacune est précédée d'une capture `before_restore`. « Annuler le retour » est proposé tant qu'aucune autre capture n'a suivi.
- **Hors périmètre** : retirer *seulement* un tour en gardant les suivants (patch inverse, conflits possibles).

### Schéma `argos.db` (migration `0003_snapshot_labels`, déjà générée, pas encore appliquée)
Table `snapshots` : `label` (TEXT, nul) et `reviewed_at` (TEXT, nul). La nouvelle sorte `prompt` ne demande pas de migration
(colonne texte, valeurs contrôlées par le domaine).

### Contrat IPC
- `snapshots.changes { sessionExternalId }` → `{ available, tracked, agentFiles, otherFiles, turns, undoableId }`
- `snapshots.restore` → action `before-turn` (tour), `session-start`, `undo` ou `file` (chemin + plage)
- `review.diff { sessionExternalId, range }` → `{ range, turns, sinceReviewAvailable, fromId, toId, files, otherFiles, truncated }`
- `review.markReviewed { snapshotId }`
- Supprimé : `snapshots.list`.

### Fichiers supprimés (avec ton accord)
`src/renderer/features/snapshots/SnapshotList.vue` (panneau E).

## Risques et questions ouvertes
- **Deux sessions Argos en même temps dans le même projet** : leurs modifications se mélangent dans les tours.
  Proposition : prévenir au lancement d'une deuxième session dans un projet déjà actif.
- **Projets volumineux** : une capture avant chaque consigne ajoute ≈ 0,1 à 1 s avant que l'agent ne démarre (mesuré sur S0 : quelques dizaines de ms).
- F17 déplacera les panneaux : ce plan fixe les comportements, pas la place définitive à l'écran.

## Étapes d'implémentation
1. **Domaine** : sortes de captures, tours, autres modifications, plages de review, tests.
2. **Git fantôme** : restauration d'un fichier, diff restreint à une liste de fichiers ; tests sur de vrais dépôts.
3. **Service des captures** : capture avant consigne, fin de tour, annulations (fichier, tour, session, annuler le retour) ; tests.
4. **Review** : plages, attribution, « Marquer comme relu » ; tests.
5. **Contrat IPC et principal.**
6. **Interface** : lignes de tour, panneau D, onglet Review (sommaire, annuler un fichier, autres modifications, relu), suppression du panneau E.
7. **Vérification réelle** dans `argos-demo` : trois tours avec une modification à la main entre deux tours,
   « Marquer comme relu », un tour de plus, puis les trois annulations et « Annuler le retour ».

## Ajout du 2026-10-04 : relire fichier par fichier
**Demande de Thibault** : on peut marquer toute la review comme relue, mais pas un seul fichier.

- **Comportement** :
  - chaque fichier de la review a une case **« Relu »** dans son en-tête ;
  - cochée, le fichier se replie et passe en retrait ;
  - le sommaire affiche `2 / 3 relus` et une coche devant chaque fichier relu.
- **Comme sur GitHub, « relu » vaut pour une version du fichier** : si l'agent le modifie à nouveau, la case se décoche toute seule.
- **« Marquer comme relu »** (toute la plage) reste disponible ; il ne coche pas les fichiers un par un.
- **Les autres modifications** n'ont pas de case : elles ne sont pas à relire comme un travail de l'agent.
- **Version du fichier** : identifiant git du contenu (blob) du côté « après » du diff (`git diff --full-index`).
  Un fichier supprimé a pour version l'identifiant nul de git.
- **Schéma `argos.db`** (nouvelle migration) : table `reviewed_files` (donnée propre à Argos, clé UUID) avec
  `provider_id`, `session_external_id`, `file_path`, `blob`, `created_at`, `updated_at`.
  Une ligne par fichier et par session (unicité sur `provider_id`, `session_external_id`, `file_path`), mise à jour à chaque coche.
- **Contrat** :
  - `FileDiff` gagne `blob` et `reviewed` ;
  - nouvelles requêtes `review.files.mark { sessionExternalId, path, blob }` et `review.files.unmark { sessionExternalId, path }`.

## Bilan de l'implémentation (2026-10-04)
- **Parcours réel dans `argos-demo`** (Haiku, trois tours) :
  - tour 1 : `fruits.md` créé ;
  - modification à la main de `notes-manuelles.md` entre deux tours ;
  - tour 2 : deux fruits ajoutés ;
  - « Marquer comme relu » ;
  - tour 3 : `legumes.md` créé.
- **Vérifié** :
  - `notes-manuelles.md` est rangé dans « Autres modifications », jamais dans le travail de l'agent ;
  - « Depuis ma dernière review » ne montre que `legumes.md` ;
  - chaque tour a sa ligne dans le compte rendu, désigné par le début de sa consigne.
- **Annulations vérifiées sur le disque** : un fichier (`legumes.md`), avant le tour 2 (`fruits.md` revient à 3 lignes,
  `legumes.md` disparaît), toute la session (seuls les fichiers d'origine restent), chacune suivie de « Annuler le retour »
  qui remet exactement l'état précédent.
- **Défaut trouvé et corrigé** : un objet réactif de Vue (plage de review, demande de retour) ne traverse pas le pont IPC ;
  les stores envoient désormais une copie simple.
- Capture avant chaque consigne : faite avant l'envoi à l'agent ; une consigne envoyée pendant un tour le rejoint sans capture.
- Avertissement « Une autre session travaille déjà dans ce projet » sur l'écran de nouvelle session.
- Migration `0003_snapshot_labels` appliquée, avec copie automatique de `argos.db` avant.
- **Relecture par fichier** (ajout du même jour) :
  - testée sur le domaine, le service et la base (une marque par fichier, remplacée à chaque nouvelle version) ;
  - le parseur lit la version de chaque fichier (`git diff --full-index`) ;
  - migration `0004_reviewed_files` relue ;
  - **pas encore vérifiée dans l'app**, l'instance de Thibault étant ouverte.

