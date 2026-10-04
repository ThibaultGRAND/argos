<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/argos-logo-sur-sombre.svg">
  <img alt="Argos" src="brand/argos-logo-sur-clair.svg" width="240">
</picture>

# Argos

**English** · [Français](docs/README.fr.md)

A local cockpit for AI coding agents (Claude Code, then Codex and Gemini CLI):
find everything, review everything, undo anything, and always know what your agents are doing.

Personal project, free, no server. Plan and working rules (in French): [PLAN.md](PLAN.md), [CLAUDE.md](CLAUDE.md).

> **Status**: in development. First public version (0.1.0) coming with V1. Changes: [CHANGELOG.md](CHANGELOG.md).

## Install

**Requirements**
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and signed in (`claude` works in your terminal).
  Argos drives the CLI with your own subscription; it never stores any credentials.
- [git](https://git-scm.com/), used to track and undo the agents' changes.

**Download** the installer for your system from the [latest release](https://github.com/ThibaultGRAND/argos/releases/latest).
Argos is not signed (no paid certificates), so your system warns you the first time:

| System | File | First launch |
|---|---|---|
| macOS (Apple Silicon / Intel) | `Argos-x.y.z-arm64.dmg` / `Argos-x.y.z.dmg` | Drag Argos to Applications, then right-click Argos > Open (or run `xattr -cr /Applications/Argos.app`). |
| Windows | `Argos-Setup-x.y.z.exe` | SmartScreen: “More info” > “Run anyway”. |
| Linux | `Argos-x.y.z.AppImage` or `argos_x.y.z_amd64.deb` | AppImage: `chmod +x Argos-*.AppImage`, then run it. |

**Updates**: Argos checks GitHub at startup and every 6 hours (can be turned off in Settings).
On Windows and with the AppImage, the new version downloads in the background and installs when you restart.
On macOS and with the `.deb`, Argos tells you a new version is out and opens its download page.

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

## Releasing (maintainer)

1. Update [CHANGELOG.md](CHANGELOG.md).
2. `npm version 0.1.0` (commit and `v0.1.0` tag), then `git push --follow-tags`.
3. The [Release workflow](.github/workflows/release.yml) builds the installers for the 3 systems into a **draft** release.
4. Review the draft, paste the changelog notes, publish. Installed apps then see the new version.

## Contributing

Pull requests are welcome: see [CONTRIBUTING.md](.github/CONTRIBUTING.md).
To report a security vulnerability, see [SECURITY.md](.github/SECURITY.md) (never in a public issue).

## License

[MIT](LICENSE) © 2026 Thibault Grand
