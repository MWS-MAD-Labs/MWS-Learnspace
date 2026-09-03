# Automated browser accessibility checks

`e2e/accessibility.spec.ts` provides a dependency-free browser baseline using Playwright APIs. It deliberately does not claim full WCAG conformance and does not replace the manual review in `wcag-2.2-aa-review-template.md`.

## Coverage

The checks run against the unauthenticated login surface and verify:

- a usable document title and declared language;
- one visible `main` landmark and a level-one heading;
- accessible names for interactive controls and images;
- absence of duplicate non-empty IDs;
- keyboard focus reaches the login action and exposes `:focus-visible`;
- activating the login action with the keyboard begins the expected same-origin authentication request without following the external OAuth flow;
- no horizontal document overflow at a 320 CSS-pixel viewport (the WCAG 1.4.10 reflow reference width);
- the browser delivers `prefers-reduced-motion: reduce` and the settled login surface has no continuously animated element.

The same spec is configured for Chromium, Firefox, and WebKit. Browser binaries must be installed separately with Playwright's normal installation command.

## Run

Start a Learnspace web/API environment, then run:

```bash
npx playwright test \
  --project=accessibility-chromium \
  --project=accessibility-firefox \
  --project=accessibility-webkit
```

Set `E2E_BASE_URL` when the environment is not available at `http://127.0.0.1:3001`.

## Scope and interpretation

A passing run means only that the encoded assertions passed in those browsers. It does not establish:

- color contrast compliance;
- correct focus management in every workflow;
- screen-reader usability;
- accessible error recovery, dialogs, tables, or dynamic announcements;
- accessibility of authenticated core workflows;
- WCAG 2.2 AA conformance.

Record those results separately using the manual report template. Any browser failure should be triaged as a possible accessibility regression, not suppressed solely to make the suite green.
