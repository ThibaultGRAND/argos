# Security Policy

## Supported versions

Argos is in early development. Only the latest release (or `main`, before the first release) receives security fixes.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Report it privately through GitHub:

1. Go to the [Security tab](https://github.com/ThibaultGRAND/argos/security) of the repository.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and its possible impact.

Only the maintainer can see your report. This is a personal project maintained in spare time:
expect an answer within **two weeks**. Once a fix is released, the advisory is published and you are credited
if you wish.

## Scope

Particularly relevant to Argos:

- reading or leaking data from agent session files (`~/.claude/…`) or project files beyond what the user opened;
- running commands or code through crafted session content, Markdown or links (renderer → main process);
- any path where Argos would store, log or transmit credentials or tokens (it must never handle them).

Out of scope: the fact that the installers are not code-signed (a known, documented choice).
