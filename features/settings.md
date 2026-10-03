# F16 — Paramètres et premier lancement

**Statut** : terminé
**Version cible** : V0
**Dépend de** : [socle_projet.md](socle_projet.md), [session_import.md](session_import.md)
**Écrans** : nouvel écran « Paramètres » (absent de la maquette, décrit ci-dessous dans le style C1) ; fenêtre de premier lancement

## Problème
La langue doit être choisie au premier lancement (décision du 2026-10-02) et les réglages réunis au même endroit.
Aujourd'hui, le thème et la langue sont dans la barre d'état, faute de mieux.

## Comportement attendu
- **Premier lancement** : une fenêtre « Choisissez votre langue / Choose your language » (Français, English), puis l'app.
- **Écran Paramètres**, ouvert par l'icône en haut à droite ou **⌘,** (Ctrl+, sous Windows et Linux).
  Mise en page du document C1 : colonne centrée, sections repérées en monospace.
  - **A. Apparence** : thème (sombre, clair, système), langue.
  - **B. Éditeur** : VSCode, VSCode Insiders, Cursor, VSCodium.
  - **C. Sources** : Claude Code (dossier lu, nombre de sessions) ; Codex et Gemini « avec la V3 ».
  - **D. Données** : emplacement des données d'Argos ; **« Reconstruire l'index »** (réimporte tout, sans toucher aux données propres à Argos).
  - **E. À propos** : version, licence, lien vers le dépôt (à compléter avec la configuration GitHub).
- La barre d'état ne garde que l'état de l'indexeur et la version.

## Critères d'acceptation
- [x] Au tout premier lancement, la langue est demandée une seule fois.
- [x] Thème, langue et éditeur se changent dans les paramètres et sont conservés.
- [x] Les sources affichent le dossier lu et le nombre de sessions.
- [x] « Reconstruire l'index » vide puis réimporte l'index, la progression s'affiche, `argos.db` n'est pas touché.
- [x] ⌘, ouvre les paramètres ; Échap ou « Retour » ramène à l'écran précédent.
- [x] Tous les textes en français et en anglais.

## Conception technique
- Préférences : ajout de `editor` et `firstRunCompleted` (lignes de la table `settings` existante, **aucune migration**).
- Contrat IPC : `settings.environment` → dossier de données, sources ; `index.rebuild`.
- Indexeur : message `rebuild` → vidage de l'index (les triggers gardent la recherche cohérente) puis import complet.

## Spécificités par fournisseur
Seul Claude Code est lu en V0 ; Codex et Gemini apparaissent comme « à venir ».

## Étapes d'implémentation
1. Préférences étendues, environnement, reconstruction de l'index.
2. Écran Paramètres, raccourci, premier lancement, barre d'état allégée.

## Bilan de l'implémentation (2026-10-03)
- Premier lancement vérifié : la fenêtre de langue s'affiche une fois, puis plus jamais.
- Reconstruction vérifiée : index vidé puis réimporté (127 sessions), progression affichée, `argos.db` intact.
- **Durée d'un import complet : environ 20 s** (contre 3 s avant F03) à cause de l'indexation plein texte ; acceptable,
  à optimiser si le volume grandit (index FTS reconstruit en une fois après un import complet plutôt que par trigger).
- Le thème et la langue ont quitté la barre d'état, qui ne garde que l'indexeur, la version et les messages brefs.
