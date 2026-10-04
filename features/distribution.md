# F09 — Distribution

**Statut** : à tester
**Version cible** : V1
**Dépend de** : PLAN.md §3.1 et §3.3 (electron-builder, electron-updater, pas de signature payante)
**Écrans** : barre d'état (version disponible) ; paramètres, nouvelle section « Mises à jour »

## Problème
Pour utiliser Argos, il faut aujourd'hui cloner le dépôt et lancer `npm run dev`. Un ami doit pouvoir l'installer
comme n'importe quelle app, puis recevoir les nouvelles versions sans y penser.

## Comportement attendu
- **Installation** depuis la page GitHub Releases :
  - macOS : `.dmg`, Apple Silicon et Intel ;
  - Windows : installateur `.exe` ;
  - Linux : `.AppImage` et `.deb`.
- **README** : prérequis (CLI `claude` installée et connectée, git), installation par OS, avertissements des apps non signées
  (macOS : clic droit > Ouvrir ; Windows : « Informations complémentaires » > « Exécuter quand même »).
- **Mises à jour** (app installée seulement), vérifiées au démarrage puis toutes les 6 heures :
  - **Windows et AppImage** : la nouvelle version se télécharge en arrière-plan. La barre d'état affiche alors
    `Version 0.2.0 prête · Redémarrer`, et le clic installe puis relance l'app.
  - **macOS et `.deb`** (installation automatique impossible sans signature ou sans droits administrateur) :
    `Version 0.2.0 disponible · Télécharger` ouvre la page de la version sur GitHub.
- **Paramètres, section « Mises à jour »** : version installée, interrupteur « Vérifier automatiquement »
  (activé par défaut), bouton « Vérifier maintenant », résultat (« À jour », « Version 0.2.0 disponible », erreur).
- **En développement**, rien n'est vérifié : la section l'indique.

## Publier une version (procédure de Thibault)
1. Mettre à jour `CHANGELOG.md`.
2. `npm version 0.1.0` (commit et tag `v0.1.0`), puis `git push --follow-tags`.
3. GitHub Actions construit les installateurs des 3 OS et crée un **brouillon** de version avec les fichiers.
4. Relire le brouillon, coller les notes du CHANGELOG, **publier**. Les apps installées voient alors la nouvelle version.

## Critères d'acceptation
- [ ] Un tag `v*` produit un brouillon de GitHub Release avec les installateurs des 3 OS et les fichiers de mise à jour.
- [x] L'app installée sur macOS démarre, retrouve la CLI `claude` lancée depuis le Finder, et pilote une session.
- [x] Le binaire Claude du SDK n'est pas embarqué (taille de l'app raisonnable).
- [x] Les données de l'app installée sont séparées de celles du développement (`Argos/` et `Argos-dev/`).
- [ ] Une version plus récente publiée est signalée ; sur Windows et Linux AppImage, elle s'installe au redémarrage.
- [ ] L'interrupteur des paramètres coupe la vérification ; « Vérifier maintenant » fonctionne.
- [x] Textes en français et en anglais.

## Conception technique
- **Dépendance** : `electron-updater` (citée dans PLAN.md §3.3).
- **Domaine** : état d'une mise à jour (`idle`, `checking`, `up-to-date`, `available`, `downloading`, `ready`, `error`),
  et mode d'installation (`automatic` ou `manual`) selon la plateforme et le format.
- **Port** `UpdateChannel` (vérifier, installer et redémarrer), adaptateur electron-updater dans le processus principal
  (Electron, donc dans `main/adapters`). `autoDownload` seulement en mode automatique.
- **Application** : service des mises à jour (préférence, minuterie de 6 heures, état courant diffusé à l'interface).
- **Préférence** `updates` (booléen, activé par défaut) : table `settings` existante, sans migration.
- **Contrat IPC** : `updates.status`, `updates.check`, `updates.install` ; événement `updates.status`.
- **Publication** : `.github/workflows/release.yml`, déclenché par un tag `v*` ; matrice macOS, Windows et Linux ;
  `electron-builder --publish always` avec le jeton de GitHub Actions (`contents: write`), en brouillon.
  `publish: github` dans `config/electron-builder.yml`.
- **macOS** : deux `.dmg` (arm64 et x64) ; le zip demandé par electron-updater sur macOS n'est pas utile (pas d'installation automatique).
- **Versions** : SemVer, `CHANGELOG.md` à la racine ; première version publique proposée : `0.1.0`.

## Spécificités par fournisseur
Aucune. La vérification « CLI `claude` trouvée depuis l'app installée » relève de F05.

## Risques et questions ouvertes
- **Avertissements des apps non signées** (Gatekeeper, SmartScreen) : documentés, acceptés (CLAUDE.md §2).
- **Module natif better-sqlite3** : il doit être reconstruit pour chaque OS et architecture. La matrice de CI construit sur chaque OS ;
  la version Intel de macOS est construite sur un Mac Apple Silicon, à vérifier sur le premier brouillon.
- **Windows non signé** : electron-updater installe sans vérifier de signature. Cela reste acceptable : la source est la seule page GitHub du dépôt.

## Étapes d'implémentation
1. Domaine et service des mises à jour, tests.
2. Adaptateur electron-updater, contrat IPC, préférence, principal.
3. Interface : barre d'état, section des paramètres.
4. Configuration de publication, workflow de release, `CHANGELOG.md`, README (anglais et français).
5. Vérification : build macOS local, lancement de l'app installée depuis le Finder, session pilotée, données séparées.

## Bilan de l'implémentation (2026-10-04)
- **App installée vérifiée sur macOS** (build local `.dmg`, lancée par `open` comme depuis le Finder) :
  - données dans `Argos/`, séparées de `Argos-dev/` ;
  - CLI trouvée (`~/.local/bin/claude`) et git trouvé ;
  - **session Haiku pilotée de bout en bout** : texte en direct, tour terminé, capture des fichiers.
- **Paquets** : `.dmg` Apple Silicon et Intel (≈ 150 Mo chacun), sans le binaire Claude du SDK.
  better-sqlite3 13 embarque ses binaires précompilés pour toutes les plateformes : pas de reconstruction par architecture.
- **Mises à jour** : « À jour » quand aucune version n'est publiée.
  - Défaut trouvé : electron-updater signale « No published versions », par deux chemins dont un sans code d'erreur.
    Il est traité comme « à jour », et l'erreur n'est plus doublée.
  - Le fichier `app-update.yml` n'est produit que par un vrai build d'installateur (pas par `--dir`).
- **Reste à vérifier au premier brouillon de version** (tag `v0.1.0` poussé par Thibault) :
  - le workflow de release sur les 3 OS ;
  - les installateurs Windows et Linux ;
  - la détection d'une version plus récente, et l'installation au redémarrage sur Windows et AppImage.

