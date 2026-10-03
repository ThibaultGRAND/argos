<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../brand/argos-logo-sur-sombre.svg">
  <img alt="Argos" src="../brand/argos-logo-sur-clair.svg" width="240">
</picture>

# Argos

[English](../README.md) · **Français**

Poste de pilotage local pour agents de code IA (Claude Code, puis Codex et Gemini CLI) :
je retrouve tout, je relis tout, je peux tout annuler, et je sais toujours ce que font mes agents.

Projet personnel, gratuit, sans serveur. Plan et règles : [PLAN.md](../PLAN.md), [CLAUDE.md](../CLAUDE.md).

> **État** : en développement (avant la V0). Pas encore de version publiée.

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

## Installation sur macOS (app non signée)

Au premier lancement, macOS bloque l'app : faire clic droit sur Argos > Ouvrir, ou lancer
`xattr -cr /Applications/Argos.app`.

## Contribuer

Les pull requests sont les bienvenues : voir [CONTRIBUTING.fr.md](../.github/CONTRIBUTING.fr.md).
Pour signaler une faille de sécurité, voir [SECURITY.md](../.github/SECURITY.md) (jamais dans une issue publique).

## Licence

[MIT](../LICENSE) © 2026 Thibault Grand
