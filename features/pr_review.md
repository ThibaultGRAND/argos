# F07 — Review façon PR

**Statut** : à tester
**Version cible** : V1
**Dépend de** : [agent_snapshots.md](agent_snapshots.md) (les diffs viennent des snapshots), [agent_sessions.md](agent_sessions.md) (renvoi à l'agent),
[open_in_editor.md](open_in_editor.md) (ouvrir à la ligne)
**Écrans** : onglet **« Review »** à côté du compte rendu (maquette globale, écran 5 : « un onglet Review à côté de Conversation »).
Nouvel écran décrit ci-dessous, dans le style du document C1.

## Problème
Relire ce que l'agent a modifié demande aujourd'hui `git diff` dans un terminal, sans lien avec la conversation,
et sans moyen simple de renvoyer des remarques précises à l'agent.

## Comportement attendu
- En-tête de session : deux onglets, **Compte rendu** et **Review · 3 fichiers**.
- **Review** : les changements entre deux snapshots de la session, **de S0 au dernier** par défaut ;
  deux listes « De » et « À » permettent de revoir un seul tour (par exemple S1 → S2).
- Pour chaque fichier : en-tête (chemin relatif, statut ajouté / modifié / supprimé, +/−, « Ouvrir dans l'éditeur »),
  puis le diff unifié, numéros de ligne avant et après, lignes ajoutées et supprimées sur fond distinct. Fichier repliable.
- **Commentaire sur une ligne** : au survol, un « + » dans la marge ouvre une zone de saisie ; le commentaire s'affiche sous la ligne.
- Barre en bas : **« 3 commentaires · Envoyer à l'agent »** : Argos compose un message (fichier, ligne, extrait, remarque)
  et le renvoie à la session (reprise si besoin). Les commentaires envoyés sont marqués comme tels.
- Clic sur un numéro de ligne : ouvre le fichier à cette ligne dans l'éditeur.
- Session sans snapshot (lancée hors d'Argos) : explication et renvoi au compte rendu.

## Critères d'acceptation
- [x] La review affiche le diff exact entre deux snapshots, fichiers ajoutés, modifiés, supprimés et binaires compris.
- [x] Changer « De » / « À » met à jour le diff.
- [x] Ajouter, afficher et supprimer un commentaire sur une ligne ; les commentaires survivent au redémarrage et à une reconstruction de l'index.
- [x] « Envoyer à l'agent » renvoie un message clair à la session et marque les commentaires envoyés.
- [x] Les très gros diffs restent fluides (fichier tronqué au-delà d'une limite, avec mention).
- [x] Textes en français et en anglais ; le message envoyé à l'agent suit la langue choisie.

## Conception technique
- **Plage par défaut** : de S0 au dernier snapshot **de fin de tour** (un « avant retour » n'est pas un travail de l'agent).
- **Diff** : `git diff --unified=3 --find-renames <de> <à>` dans le dépôt fantôme, lu par un analyseur de diff unifié (fonction pure testée).
  Limite : 1 500 lignes par fichier, 200 fichiers ; au-delà, mention « tronqué ».
- **Schéma `argos.db`** (nouvelle migration) : table `review_comments` (donnée propre à Argos, clé UUID) :
  `provider_id`, `session_external_id`, `snapshot_id` (snapshot « À » au moment du commentaire), `file_path`, `line`, `side` (`new` | `old`),
  `excerpt` (ligne commentée), `body`, `sent_at`, `created_at`, `updated_at`. Index sur (`provider_id`, `session_external_id`).
- Domaine : commentaire de review, composition du message pour l'agent (français / anglais).
- Ports : `ShadowRepository.diff`, `ReviewCommentRepository`.
- Application : service de review (diff entre snapshots, commentaires, envoi via les sessions en direct).
- Contrat IPC : `review.diff`, `review.comments.list`, `review.comments.add`, `review.comments.delete`, `review.send`.

## Spécificités par fournisseur
Aucune : la review repose sur les snapshots (F06) et l'envoi passe par `AgentRuntime`.

## Risques et questions ouvertes
- Sessions lancées hors d'Argos : pas de review sans snapshot ; une review « modifications non commitées du projet » pourrait venir ensuite.
- Le panneau D. Fichiers sera repensé avec F17 (lien possible : clic sur un fichier → son diff dans la review).

## Étapes d'implémentation
1. Analyseur de diff, `diff` du git fantôme, tests sur de vrais dépôts.
2. Domaine, migration `review_comments`, dépôt, service, tests.
3. Contrat IPC et principal.
4. Interface : onglets, diff, commentaires, envoi.

## Bilan de l'implémentation (2026-10-03)
- Analyseur de diff testé : fichiers modifiés, ajoutés, supprimés, binaires, renommés, chemins avec espaces et accents, limites.
- **Parcours réel dans l'app** (projet `argos-demo`) : review S0 → S1, commentaire sur la ligne « Minou »,
  « Envoyer à l'agent » : message composé (fichier, ligne, extrait, remarque), session reprise, commentaires marqués « envoyé »,
  l'agent a appliqué les remarques (« Tigrou », « petite lune »), nouveaux snapshots enregistrés.
- **Défaut corrigé** : une session relancée par la review (démarrée par le processus principal) n'était pas suivie par l'interface,
  et sa demande de permission restait invisible. L'interface adopte désormais toute session inconnue dès son premier événement.
- Clé étrangère `review_comments.snapshot_id` → `snapshots.id` (migration régénérée avant toute application).
