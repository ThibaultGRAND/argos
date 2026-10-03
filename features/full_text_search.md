# F03 — Recherche plein texte

**Statut** : terminé
**Version cible** : V0
**Dépend de** : [session_import.md](session_import.md), [session_detail.md](session_detail.md)
**Écrans** : palette ⌘K de la maquette globale (écran 3) ; bouton « Rechercher ⌘K » de la barre latérale

## Problème
Retrouver « la session où on avait corrigé le slug » est impossible aujourd'hui : il faut rouvrir les sessions une à une.
C'est la première plainte des développeurs qui utilisent des agents au quotidien.

## Comportement attendu
- **⌘K** (Ctrl+K sous Windows et Linux) ou le bouton « Rechercher » ouvre une **palette** au centre de la fenêtre.
- La recherche porte sur **toutes les conversations** de tous les projets, dès 2 caractères, pendant la frappe.
- Résultats groupés :
  - **Sessions** dont le titre correspond (8 au plus) ;
  - **Messages** qui contiennent les mots cherchés (50 au plus), les plus pertinents d'abord, avec un **extrait où les mots sont surlignés**,
    le titre de la session, le projet, l'auteur (utilisateur ou agent) et la date.
- Filtres rapides : **projet** (tous / projet actuel) et **période** (tout, 7 jours, 30 jours, 1 an).
- Clavier : ↑ ↓ pour se déplacer, Entrée pour ouvrir, Échap pour fermer.
- Ouvrir un message ouvre la session **à l'endroit du message**, qui est mis en évidence un instant.
- Recherche **insensible à la casse et aux accents** (« evenement » trouve « événement »), le dernier mot est cherché comme un début de mot.

## Critères d'acceptation
- [x] ⌘K ou Ctrl+K ouvre la palette depuis n'importe quel écran ; Échap la ferme.
- [x] Un mot présent dans un ancien message est retrouvé en moins de 2 secondes (critère de fin de V0).
- [x] Les mots cherchés sont surlignés dans les extraits, sans injecter de HTML.
- [x] Les filtres projet et période réduisent les résultats.
- [x] Ouvrir un résultat amène au message dans le compte rendu, même s'il est au-delà de la première page.
- [x] Les caractères spéciaux (guillemets, `*`, `-`, parenthèses) ne provoquent pas d'erreur.
- [x] Les nouveaux messages importés sont aussitôt cherchables.
- [x] Textes en français et en anglais.

## Conception technique

### Schéma de `index.db` (migration SQL dédiée, Drizzle ne modélise pas FTS5)
- Table virtuelle **`messages_fts`** (FTS5) sur `messages.text`, en **contenu externe** (`content='messages'`) :
  le texte n'est pas stocké deux fois.
- Tokeniseur `unicode61 remove_diacritics 2` : insensible à la casse et aux accents.
- **Triggers** sur `messages` (insertion, suppression, mise à jour) pour garder l'index synchronisé.
- La migration reconstruit l'index des messages déjà importés (`rebuild`).

### Requêtes
- Messages : `messages_fts MATCH ?`, tri par pertinence (`bm25`), extrait par `snippet()` avec des marqueurs
  de début et de fin de surlignage (caractères de contrôle, découpés par l'interface : aucun HTML).
- Sessions : correspondance du titre personnalisé, du titre automatique ou du premier message.
- La saisie est convertie en requête FTS5 sûre : chaque mot entre guillemets, le dernier en préfixe, mots reliés par ET.
- Domaine : normalisation de la saisie (2 caractères minimum, 200 maximum), calcul du début de période.

### Contrat IPC
`search.query` `{ query, projectId?, period? }` → `{ sessions, messages }`.

### Interface
- Palette en surcouche (`features/search/`), raccourci global dans l'app, store de recherche.
- Route `#/sessions/:id?seq=N` : le compte rendu charge les pages jusqu'au message, le fait défiler et le met en évidence.

## Spécificités par fournisseur
Aucune : la recherche porte sur l'index normalisé.

## Risques et questions ouvertes
- Les cibles des appels d'outils (fichiers, commandes) ne sont pas encore cherchables ; à ajouter si le besoin se confirme.
- La palette ne contient que la recherche : les commandes (changer de thème, de projet…) viendront plus tard.

## Étapes d'implémentation
1. Migration FTS5 et triggers, requêtes de recherche, tests sur une vraie base.
2. Cas d'usage, contrat IPC.
3. Palette, raccourci, navigation clavier.
4. Ouverture d'une session à un message précis.

## Bilan de l'implémentation (2026-10-03)
- Sur les données réelles : résultats affichés en 169 ms après la frappe (anti-rebond de 150 ms compris).
- Ouverture d'un résultat profond vérifiée : message n° 903 d'une session de 1 107 entrées, chargé, centré et mis en évidence.
- La migration FTS5 s'applique sur un index existant et reconstruit l'index des messages déjà importés.
- Tests : requête FTS5 sûre, casse et accents, préfixe, filtres, caractères spéciaux, cohérence après réimportation (triggers).
