# Contribuer à Argos

[English](CONTRIBUTING.md) · **Français**

> Version française de [CONTRIBUTING.md](CONTRIBUTING.md). En cas de différence, la version anglaise fait foi.

Merci de ton intérêt ! Argos est un projet personnel partagé entre amis. Les contributions sont bienvenues,
mais c'est le mainteneur ([@ThibaultGRAND](https://github.com/ThibaultGRAND)) qui décide de ce qui est fusionné.

## Avant de commencer

- **Petite correction** (coquille, bug évident) : ouvre directement une pull request.
- **Tout le reste** (nouvelle fonctionnalité, changement de comportement, nouvelle dépendance) : ouvre d'abord
  une issue, pour qu'on se mette d'accord sur l'approche avant que tu y passes du temps.
- Lis [PLAN.md](../PLAN.md) (architecture, roadmap, décisions) et [CLAUDE.md](../CLAUDE.md) (règles de travail).
  Une décision inscrite au journal des décisions de PLAN.md ne se rediscute pas sans motif nouveau.

## Contraintes non négociables

Une contribution qui enfreint l'une d'elles ne sera pas fusionnée :

- App de bureau sur macOS, Windows **et** Linux : aucun chemin, fin de ligne ou commande shell propre à un OS.
- Aucun serveur, aucun hébergement, aucun service payant, aucune télémétrie.
- Argos ne stocke ni ne manipule jamais d'identifiants ou de tokens : il lance les CLI (`claude`, `codex`, `gemini`),
  qui gèrent elles-mêmes la connexion.
- Aucun texte affiché codé en dur dans l'interface : des clés de traduction, complètes dans `fr.json` **et** `en.json`.

## Installation

Prérequis : Node 24 (voir `.nvmrc`) et git.

```bash
git clone https://github.com/<ton-compte>/argos.git
cd argos
npm install
npm run dev
```

## Proposer une modification

1. Forke le dépôt et crée une branche à partir de `main` :
   - `feat/<nom-court>` pour une fonctionnalité, `fix/<nom-court>` pour un bug, `docs/<nom-court>` pour la documentation.
2. Respecte l'architecture (PLAN.md §2) : `UI → application → domaine ← infrastructure`.
   Aucune logique métier dans les composants ni les stores. Typage strict, pas de `any` sans justification écrite.
3. Ajoute ou mets à jour les tests (Vitest), au minimum sur le domaine et les cas d'usage. Les adaptateurs se testent
   sur des données enregistrées (`tests/fixtures/`) : **ne commite jamais de vrais fichiers de session**, qui peuvent
   contenir des données personnelles ou des secrets.
4. Si ta modification touche une fonctionnalité, mets à jour sa fiche dans `features/` (statut, critères d'acceptation).
   Un changement de schéma de base de données est décrit dans la fiche et passe par une migration Drizzle générée.
5. Lance la vérification complète en local. Elle doit passer :

   ```bash
   npm run verify
   ```

## Messages de commit

Format : `type(portée): résumé`. La portée est facultative ; mets le numéro de la fonctionnalité quand il y en a un.

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité : `feat(F03): recherche plein texte dans les sessions` |
| `fix` | Correction de bug |
| `docs` | Documentation seule |
| `refactor` | Changement de code qui ne corrige rien et n'ajoute rien |
| `test` | Tests seuls |
| `chore` / `ci` | Outillage, dépendances, CI |

Les commits peuvent être en français ou en anglais.

## Pull requests

- Un seul sujet par pull request. Remplis le modèle de pull request.
- La CI lance `npm run verify` et `npm run build` sur macOS, Windows et Linux. Pour une pull request venant
  d'un fork, le mainteneur doit d'abord autoriser l'exécution de la CI : c'est une mesure de sécurité de GitHub, pas un jugement.
- Les pull requests sont **fusionnées en squash** par le mainteneur : le titre de la pull request devient le message
  du commit, donne-lui donc le format ci-dessus.

## Licence

En contribuant, tu acceptes que tes contributions soient placées sous la [licence MIT](../LICENSE) du projet.

## Code de conduite

Ce projet applique le [code de conduite](CODE_OF_CONDUCT.md).
