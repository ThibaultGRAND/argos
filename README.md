# Argos

Poste de pilotage local pour agents de code IA (Claude Code, puis Codex et Gemini CLI) :
je retrouve tout, je relis tout, je peux tout annuler, et je sais toujours ce que font mes agents.

Projet personnel, gratuit, sans serveur. Plan et règles : [PLAN.md](PLAN.md), [CLAUDE.md](CLAUDE.md).

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
