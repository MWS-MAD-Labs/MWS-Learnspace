# Contributing to Learnspace

## Prerequisites

- Node.js `20.20.2` (see [`.nvmrc`](.nvmrc))
- npm `10.8.2` or newer

Using `nvm`:

```bash
nvm use
npm ci
```

Use `npm ci` for reproducible installs. Start the prototype with `npm run dev` and open <http://localhost:3000>.

## Branches and changes

1. Create a focused branch from `main`.
2. Keep changes scoped and avoid including real student data or secrets.
3. Add or update tests and documentation for behavior or configuration changes.
4. Use Conventional Commit-style commit messages described in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Required validation

Run all checks before opening a pull request:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Use `npm run format` to apply repository formatting.

## Pull requests

Complete the pull-request template, including the security, data migration, test, documentation, and environment-impact checks. Explain remaining risks and provide migration and rollback steps when stored data or schemas change.

Security vulnerabilities must not be reported in public issues. Follow [`SECURITY.md`](SECURITY.md).
