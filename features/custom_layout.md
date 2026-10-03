# F17 — Disposition personnalisable

**Statut** : à définir (souhaits notés le 2026-10-03, à planifier)
**Version cible** : V1
**Dépend de** : [settings.md](settings.md) (réinitialisation, mémorisation)
**Écrans** : structure 2a de la maquette globale, qui reste la disposition par défaut

## Problème
La disposition 2a est fixe : impossible d'agrandir le document, de masquer un panneau inutile
ou de placer les panneaux là où on les veut. Thibault veut un outil « vraiment personnalisable », comme VSCode.

## Souhaits de Thibault (2026-10-03)
- **Redimensionner** les colonnes en glissant leur bordure, avec le **curseur flèche ↔** au survol (comme dans VSCode).
- **Déplacer** les panneaux : choix validé, **« panneaux entre colonnes »** :
  glisser-déposer Sessions, D. Fichiers, E. Snapshots et F. Fiche pour les réordonner
  ou les passer de la colonne de gauche à celle de droite.
- **Activer / désactiver** chaque panneau et chaque colonne.
- **Revoir le panneau « D. Fichiers », qui « n'est pas bon du tout »** (retour du 2026-10-03).
  À préciser avec Thibault au moment de la planification : lisibilité des chemins tronqués, regroupement par dossier,
  tri, accès au diff du fichier (lien avec F07, review façon PR).

## Pistes déjà proposées (à confirmer au moment de la planification)
- Double-clic sur une bordure : largeur par défaut.
- Raccourcis : ⌘B (colonne de gauche), ⌘⌥B (colonne de droite), comme VSCode.
- Disposition mémorisée (préférences, table `settings` existante, sans migration) et « Réinitialiser la disposition » dans les paramètres.
- Glisser-déposer natif du navigateur : aucune bibliothèque nouvelle.

## Écartés
- Ancrage libre façon VSCode (onglets, zones en bas, panneaux empilés n'importe où) : 3 à 4 fois plus long et plus fragile.
- Simple inversion des côtés : trop limitée.
