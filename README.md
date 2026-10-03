<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/argos-logo-sur-sombre.svg">
  <img alt="Argos" src="brand/argos-logo-sur-clair.svg" width="240">
</picture>

# Argos

**English** · [Français](docs/README.fr.md)

A local cockpit for AI coding agents (Claude Code, then Codex and Gemini CLI):
find everything, review everything, undo anything, and always know what your agents are doing.

Personal project, free, no server. Plan and working rules (in French): [PLAN.md](PLAN.md), [CLAUDE.md](CLAUDE.md).

> **Status**: in development (pre-V0). No release yet.

## Development

Requirements: Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Run the app in development mode |
| `npm run verify` | Types, lint, format, architecture and tests |
| `npm run build:mac` / `build:win` / `build:linux` | Build the installer for that OS |
| `npm run db:generate:argos` | Generate an `argos.db` migration (review it before applying) |

## Installing on macOS (unsigned app)

On first launch, macOS blocks the app: right-click Argos > Open, or run
`xattr -cr /Applications/Argos.app`.

## Contributing

Pull requests are welcome: see [CONTRIBUTING.md](.github/CONTRIBUTING.md).
To report a security vulnerability, see [SECURITY.md](.github/SECURITY.md) (never in a public issue).

## License

[MIT](LICENSE) © 2026 Thibault Grand
