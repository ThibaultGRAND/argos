# Contributing to Argos

**English** · [Français](CONTRIBUTING.fr.md)

Thanks for your interest! Argos is a personal project shared with friends. Contributions are welcome, but
the maintainer ([@ThibaultGRAND](https://github.com/ThibaultGRAND)) decides what gets merged.

## Before you start

- **Small fix** (typo, obvious bug): open a pull request directly.
- **Anything bigger** (new feature, behavior change, new dependency): open an issue first, so we can agree
  on the approach before you spend time on it.
- Read [PLAN.md](../PLAN.md) (architecture, roadmap, decisions) and [CLAUDE.md](../CLAUDE.md) (working rules).
  Both are in French. A decision recorded in the PLAN.md decision log is not reopened without a new reason.

## Non-negotiable constraints

A contribution that breaks one of these will not be merged:

- Desktop app on macOS, Windows **and** Linux: no OS-specific paths, line endings or shell commands.
- No server, no hosting, no paid service, no telemetry.
- Argos never stores or handles credentials or tokens: it launches the CLIs (`claude`, `codex`, `gemini`),
  which handle sign-in themselves.
- No user-facing text hard-coded in the UI: use translation keys, complete in **both** `fr.json` and `en.json`.

## Setup

Requirements: Node 24 (see `.nvmrc`) and git.

```bash
git clone https://github.com/<your-account>/argos.git
cd argos
npm install
npm run dev
```

## Making a change

1. Fork the repository and create a branch from `main`:
   - `feat/<short-name>` for a feature, `fix/<short-name>` for a bug fix, `docs/<short-name>` for documentation.
2. Follow the architecture (PLAN.md §2): `UI → application → domain ← infrastructure`.
   No business logic in components or stores. Strict typing, no `any` without a written reason.
3. Add or update tests (Vitest) for the domain and use cases at minimum. Adapters are tested on recorded data
   (`tests/fixtures/`): **never commit real session files** that may contain personal data or secrets.
4. If your change affects a feature, update its file in `features/` (status, acceptance criteria).
   A database schema change must be described in the feature file and go through a generated Drizzle migration.
5. Run the full check locally. It must pass:

   ```bash
   npm run verify
   ```

## Commit messages

Format: `type(scope): summary`. The scope is optional; use the feature number when there is one.

| Type | Use for |
|---|---|
| `feat` | A new feature: `feat(F03): full-text search across sessions` |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Tests only |
| `chore` / `ci` | Tooling, dependencies, CI |

Commits may be written in English or French.

## Pull requests

- One topic per pull request. Fill in the pull request template.
- The CI runs `npm run verify` and `npm run build` on macOS, Windows and Linux. For a pull request from
  a fork, the maintainer must approve the CI run first: this is a GitHub security measure, not a judgment.
- Pull requests are **squash-merged** by the maintainer: the pull request title becomes the commit message,
  so give it the commit format above.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](../LICENSE)
of this project.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
