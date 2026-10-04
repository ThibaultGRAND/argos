<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../brand/argos-logo-sur-sombre.svg">
  <img alt="Argos" src="../brand/argos-logo-sur-clair.svg" width="240">
</picture>

# Argos

[English](../README.md) · **Français**

Poste de pilotage local pour agents de code IA (Claude Code, puis Codex et Gemini CLI) :
je retrouve tout, je relis tout, je peux tout annuler, et je sais toujours ce que font mes agents.

Projet personnel, gratuit, sans serveur. Plan et règles : [PLAN.md](../PLAN.md), [CLAUDE.md](../CLAUDE.md).

> **État** : en développement. Première version publique (0.1.0) avec la V1. Nouveautés : [CHANGELOG.md](../CHANGELOG.md) (en anglais).

## Installation

**Prérequis**
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installé et connecté (`claude` fonctionne dans ton terminal).
  Argos pilote la CLI avec ton propre abonnement ; il ne stocke jamais d'identifiants.
- [git](https://git-scm.com/), qui sert à suivre et annuler les modifications des agents.

**Télécharge** l'installateur de ton système sur la [dernière version](https://github.com/ThibaultGRAND/argos/releases/latest).
Argos n'est pas signé (pas de certificat payant) : ton système te prévient la première fois.

| Système | Fichier | Premier lancement |
|---|---|---|
| macOS (Apple Silicon / Intel) | `Argos-x.y.z-arm64.dmg` / `Argos-x.y.z.dmg` | Glisser Argos dans Applications, puis clic droit sur Argos > Ouvrir (ou `xattr -cr /Applications/Argos.app`). |
| Windows | `Argos-Setup-x.y.z.exe` | SmartScreen : « Informations complémentaires » > « Exécuter quand même ». |
| Linux | `Argos-x.y.z.AppImage` ou `argos_x.y.z_amd64.deb` | AppImage : `chmod +x Argos-*.AppImage`, puis la lancer. |

**Mises à jour** : Argos vérifie sur GitHub au démarrage puis toutes les 6 heures (désactivable dans les paramètres).
Sur Windows et avec l'AppImage, la nouvelle version se télécharge en arrière-plan et s'installe au redémarrage.
Sur macOS et avec le `.deb`, Argos signale la nouvelle version et ouvre sa page de téléchargement.

## Développement

Prérequis : Node 24 (voir `.nvmrc`).

```bash
npm install
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l'app en développement |
| `npm run verify` | Types, lint, format, architecture et tests |
| `npm run build:mac` / `build:win` / `build:linux` | Produit l'installateur de l'OS |
| `npm run db:generate:argos` | Génère une migration de `argos.db` (à relire avant de l'appliquer) |

## Publier une version (mainteneur)

1. Mettre à jour [CHANGELOG.md](../CHANGELOG.md).
2. `npm version 0.1.0` (commit et tag `v0.1.0`), puis `git push --follow-tags`.
3. Le [workflow Release](../.github/workflows/release.yml) construit les installateurs des 3 systèmes dans un **brouillon** de version.
4. Relire le brouillon, coller les notes du CHANGELOG, publier. Les apps installées voient alors la nouvelle version.

## Contribuer

Les pull requests sont les bienvenues : voir [CONTRIBUTING.fr.md](../.github/CONTRIBUTING.fr.md).
Pour signaler une faille de sécurité, voir [SECURITY.md](../.github/SECURITY.md) (jamais dans une issue publique).

## Licence

[MIT](../LICENSE) © 2026 Thibault Grand
