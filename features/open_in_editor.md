# F04 — Ouvrir dans l'éditeur

**Statut** : à tester
**Version cible** : V0
**Dépend de** : [session_detail.md](session_detail.md), [settings.md](settings.md) (choix de l'éditeur)
**Écrans** : bouton « Ouvrir dans VSCode » de l'en-tête de session (maquette 2a) ; fichiers du panneau D cliquables

## Problème
Argos n'est pas un IDE (CLAUDE.md §1) : relire un fichier modifié ou reprendre le projet doit se faire en un clic dans l'éditeur.

## Comportement attendu
- En-tête d'une session : bouton **« Ouvrir dans VSCode »** qui ouvre le dossier du projet.
- Panneau **D. Fichiers** : cliquer un fichier l'ouvre dans l'éditeur.
- L'éditeur se choisit dans les paramètres : **VSCode** (par défaut), VSCode Insiders, Cursor, VSCodium ; le libellé du bouton suit ce choix.
- Fichier supprimé depuis la session : message « Ce fichier n'existe plus ».

## Critères d'acceptation
- [ ] Le bouton ouvre le projet dans l'éditeur choisi, sur macOS, Windows et Linux.
- [ ] Cliquer un fichier du panneau D l'ouvre dans l'éditeur.
- [x] Un chemin inconnu d'Argos (hors des projets et des fichiers modifiés indexés) est refusé.
- [x] Un fichier absent affiche un message clair, sans erreur technique.

## Conception technique
- Ouverture par le **lien d'application de l'éditeur** (`vscode://file/<chemin>:<ligne>`, `cursor://…`, `vscodium://…`),
  confiée au système : fonctionne sur les 3 OS sans dépendre de la commande `code` dans le `PATH`.
- Domaine : construction du lien (chemins Windows et caractères spéciaux), liste des éditeurs.
- **Sécurité** (PLAN.md §2.3, flux E) : seuls les chemins d'un projet connu ou d'un fichier modifié présent dans l'index sont acceptés.
- Ports : `EditorLauncher` (ouverture du lien), `PathInspector` (existence du fichier), `SessionQueries.isKnownPath`.
- Contrat IPC : `editor.open` `{ path, line? }`. Préférence `editor` ajoutée (aucune nouvelle table : `settings` existe).

## Spécificités par fournisseur
Aucune.

## Risques et questions ouvertes
- Si l'éditeur n'est pas installé, le système affiche son propre message : Argos ne peut pas le détecter de façon fiable.

## Étapes d'implémentation
1. Domaine (liens, éditeurs), cas d'usage et tests.
2. Contrat IPC, adaptateurs, bouton et fichiers cliquables.

## Bilan de l'implémentation (2026-10-03)
- Refus vérifié dans l'app : `/etc/passwd` → « Argos n'ouvre que les fichiers de tes projets » ; fichier supprimé → « Ce fichier n'existe plus ».
- Un projet situé à la racine du disque (« / ») ne rend pas tout le disque accessible.
- **Ouverture réelle dans l'éditeur non déclenchée par Claude** (pour ne pas ouvrir de fenêtre sur la machine de Thibault) : à tester par Thibault.
