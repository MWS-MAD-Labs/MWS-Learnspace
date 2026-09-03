# Security scanning and exceptions

Learnspace runs security checks in `.github/workflows/security.yml` on pull requests, pushes to `main` and `staging`, a weekly schedule, and manual dispatches.

## Required checks

| Risk                           | Control                                           | Failure threshold                                                 |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------- |
| Committed secrets              | Gitleaks scans Git history using `.gitleaks.toml` | Any finding                                                       |
| Newly introduced dependencies  | GitHub Dependency Review on pull requests         | Critical advisory                                                 |
| Locked npm dependencies        | `npm audit` against `package-lock.json`           | Critical advisory                                                 |
| JavaScript/TypeScript source   | CodeQL extended security queries                  | Critical findings in the generated SARIF fail the workflow        |
| API, migration, and web images | Trivy OS and library vulnerability scan           | Any critical vulnerability, including one without a published fix |

Repository administrators should make the applicable workflow jobs required status checks for protected branches. The CodeQL job currently retains and evaluates SARIF inside the workflow without uploading it because GitHub code scanning is not enabled for this repository. If code scanning is enabled later, add the required `security-events: write` permission and restore SARIF upload so findings are also governed through the repository Security interface.

## Handling findings

1. Confirm the finding against the exact commit, package version, or image digest.
2. Prefer removing the secret, upgrading/replacing the dependency, or changing the affected code or base image.
3. Rotate every real credential exposed to Git history before removing it from the repository. Rewriting history does not invalidate a credential.
4. If remediation cannot be completed immediately, open a private security tracking item and assess exploitability, affected data, compensating controls, and deployment exposure.
5. Do not merge or publish while a critical finding is active unless an approved, time-limited exception exists.

## Exception requirements

Scanner exceptions are code-reviewed security decisions, not a mechanism for keeping CI green. An exception must:

- identify the scanner and finding ID;
- be scoped to the narrowest path, package URL (PURL), rule, or image possible;
- state why the finding is a false positive or why risk is temporarily accepted;
- name the accountable owner and link a private tracking item without including sensitive exploit details;
- record compensating controls;
- include an expiry date of no more than 30 days for critical findings and 90 days for lower severities;
- be approved by a maintainer other than the author.

Expired exceptions must be removed or re-approved through a new review. CI must never use `continue-on-error` to bypass a required scanner.

### Trivy

Add exceptions to `.trivyignore.yaml`. Use `paths` or `purls` wherever Trivy supports them, a descriptive `statement`, and `expired_at` in `YYYY-MM-DD` form.

```yaml
vulnerabilities:
  - id: CVE-YYYY-NNNN
    purls:
      - pkg:npm/example@1.2.3
    statement: 'Owner: team; tracking: private issue; reason and compensating control'
    expired_at: 2026-10-01
```

A broad, unscoped CVE exception requires justification that the vulnerable component appears in only one controlled location. Do not ignore all unfixed vulnerabilities globally.

### Gitleaks

Prefer a rule- and path-scoped allowlist in `.gitleaks.toml`. Never allowlist a real token, private key, password, session secret, or production-like credential. Synthetic test values should be unmistakably non-secret and constrained to fixtures or documentation.

Because Gitleaks TOML entries do not enforce expiry metadata, place the owner, tracking reference, and removal date in an adjacent comment and in the reviewing pull request.

### Dependency Review and npm audit

Do not weaken the workflow threshold to exempt one package. Remediate the lockfile or document a repository-level temporary exception approved by maintainers. If an advisory must be accepted, record the exact package/version, affected execution path, compensating control, owner, and expiry in this document before changing scanner configuration.

### CodeQL

While SARIF is gated only inside the workflow, document any reviewed non-critical finding or critical exception with the rule ID, technical rationale, owner, compensating controls, and expiry. If GitHub code scanning is enabled later, use its dismissal flow so findings retain audit history. Do not exclude broad source directories to hide actionable results.

## Validation and safe synthetic tests

- Run `npm audit --audit-level=critical` locally for dependency findings.
- Run Gitleaks `v8.30.1` with `.gitleaks.toml`, or use the same container command as the workflow. Test only with a documented fake pattern on a disposable branch; never commit a live credential.
- Build each Docker target and run Trivy with `.trivyignore.yaml` before requesting an exception.
- Review the CodeQL SARIF gate output in the workflow. If repository code scanning is enabled later, also review alerts in the **Security** tab.

Scanner databases and advisory services are network-dependent. A transient upstream outage should be rerun; it is not grounds for suppressing findings or making the job optional.
