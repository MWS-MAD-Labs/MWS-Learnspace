# Learnspace WCAG 2.2 AA manual review report template

> **Status:** Template only. Creating or committing a copy does not mean the review occurred or that Learnspace conforms to WCAG 2.2 AA.

Copy this file to a dated report such as `docs/accessibility/2026-09-02-rc1-review.md`. Remove instructions that do not apply, but retain failed, blocked, and not-tested results.

## Review metadata

| Field                                 | Value                                          |
| ------------------------------------- | ---------------------------------------------- |
| Candidate version / commit            | TODO                                           |
| Environment and URL                   | TODO                                           |
| Review dates                          | TODO                                           |
| Reviewers                             | TODO                                           |
| Browsers and versions                 | TODO                                           |
| Operating systems                     | TODO                                           |
| Screen readers / assistive technology | TODO                                           |
| Viewports and zoom levels             | TODO                                           |
| Test data profile (sanitized)         | TODO                                           |
| Automated check command and artifact  | TODO                                           |
| Overall status                        | NOT STARTED / IN PROGRESS / BLOCKED / COMPLETE |

## Result vocabulary

Use one result per check:

- **PASS** — verified in the stated environment with evidence.
- **FAIL** — reproducible accessibility defect.
- **BLOCKED** — could not test; record the dependency and owner.
- **NOT TESTED** — intentionally not reviewed yet.
- **N/A** — criterion is inapplicable; explain why.

Severity guidance:

- **Critical:** prevents completion of a core workflow with a supported assistive method or exposes the wrong data/context.
- **High:** major loss of information or operation with no reasonable workaround.
- **Medium:** material friction or ambiguity with a workaround.
- **Low:** limited impact, polish, or best-practice issue.

## Core workflow matrix

Complete every workflow with keyboard-only use and at least one supported screen reader/browser pairing. Repeat role-sensitive workflows for each applicable membership role.

| Workflow                                       | Role/test identity | Keyboard   | Focus      | Names/labels | Errors/status | Dialogs/tables | Reflow/zoom | Screen reader | Result     | Evidence/issues |
| ---------------------------------------------- | ------------------ | ---------- | ---------- | ------------ | ------------- | -------------- | ----------- | ------------- | ---------- | --------------- |
| Login, denial, disabled account, logout        | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | N/A            | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |
| Attendance list, edit, validation, save        | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | NOT TESTED     | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |
| Learning Journey list, detail, edit/workflow   | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | NOT TESTED     | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |
| Observation list, entry, reference drawer      | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | NOT TESTED     | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |
| IEP list, plan, workflow transitions           | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | NOT TESTED     | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |
| Weekly report list, edit, workflow transitions | TODO               | NOT TESTED | NOT TESTED | NOT TESTED   | NOT TESTED    | NOT TESTED     | NOT TESTED  | NOT TESTED    | NOT TESTED | TODO            |

## Detailed WCAG 2.2 AA checklist

For every FAIL, add a defect in the findings table with criterion, route/state, steps, actual/expected behavior, severity, and owner.

### Perceivable

| Check                                                                                                            | WCAG                | Result     | Evidence / notes                                                  |
| ---------------------------------------------------------------------------------------------------------------- | ------------------- | ---------- | ----------------------------------------------------------------- |
| Informative images/icons have useful text alternatives; decorative graphics are ignored                          | 1.1.1               | NOT TESTED | TODO                                                              |
| Form controls and grouped inputs expose programmatic labels and instructions                                     | 1.3.1, 3.3.2, 4.1.2 | NOT TESTED | TODO                                                              |
| Headings, landmarks, lists, and table headers reflect visual relationships                                       | 1.3.1               | NOT TESTED | TODO                                                              |
| Reading and focus order remains meaningful without CSS positioning                                               | 1.3.2, 2.4.3        | NOT TESTED | TODO                                                              |
| Instructions do not rely only on shape, position, color, sound, or device orientation                            | 1.3.3, 1.3.4, 1.4.1 | NOT TESTED | TODO                                                              |
| Input purpose/autocomplete is identified where personal data is requested                                        | 1.3.5               | NOT TESTED | TODO                                                              |
| Text and meaningful icon contrast meets 4.5:1 or applicable 3:1 exception                                        | 1.4.3               | NOT TESTED | Record sampled colors/tool                                        |
| UI component boundaries, focus indicators, and meaningful graphics meet 3:1 non-text contrast                    | 1.4.11              | NOT TESTED | TODO                                                              |
| Text can resize to 200% without loss of content or function                                                      | 1.4.4               | NOT TESTED | TODO                                                              |
| Content reflows at 320 CSS px width / 256 CSS px height without two-dimensional scrolling except allowed content | 1.4.10              | NOT TESTED | Test browser zoom and narrow viewport                             |
| Text spacing overrides do not clip or hide content                                                               | 1.4.12              | NOT TESTED | 1.5 line height, 2x paragraph spacing, 0.12em letter, 0.16em word |
| Hover/focus content is dismissible, hoverable, and persistent when required                                      | 1.4.13              | NOT TESTED | TODO                                                              |
| Audio/video alternatives, captions, and controls meet applicable criteria                                        | 1.2.x               | N/A        | Confirm no applicable media or test it                            |

### Operable

| Check                                                                                   | WCAG          | Result     | Evidence / notes                             |
| --------------------------------------------------------------------------------------- | ------------- | ---------- | -------------------------------------------- |
| Every operation is keyboard accessible with no trap                                     | 2.1.1, 2.1.2  | NOT TESTED | Tab, Shift+Tab, Enter, Space, arrows, Escape |
| Single-character shortcuts can be disabled/remapped or are focus-scoped                 | 2.1.4         | NOT TESTED | TODO                                         |
| Time limits, auto-updating content, and session expiry provide required control/warning | 2.2.x         | NOT TESTED | Include authentication expiry                |
| No content flashes above safe thresholds                                                | 2.3.1         | NOT TESTED | TODO                                         |
| Skip/landmark mechanisms bypass repeated content                                        | 2.4.1         | NOT TESTED | TODO                                         |
| Pages have descriptive titles and headings/labels describe purpose                      | 2.4.2, 2.4.6  | NOT TESTED | TODO                                         |
| Focus order follows task order, including after validation and dynamic updates          | 2.4.3         | NOT TESTED | TODO                                         |
| Link purpose is clear in context                                                        | 2.4.4         | NOT TESTED | TODO                                         |
| Multiple ways exist to locate content where applicable                                  | 2.4.5         | NOT TESTED | TODO                                         |
| Keyboard focus is visible and not fully obscured by sticky/overlay content              | 2.4.7, 2.4.11 | NOT TESTED | TODO                                         |
| Focus indicator size/contrast is strong enough for enhanced criterion where feasible    | 2.4.13        | NOT TESTED | AAA advisory, record gaps                    |
| Pointer gestures have single-pointer alternatives and cancellation                      | 2.5.1, 2.5.2  | NOT TESTED | TODO                                         |
| Visible labels are contained in accessible names                                        | 2.5.3         | NOT TESTED | Voice-control check                          |
| Motion activation has a UI alternative and can be disabled                              | 2.5.4         | NOT TESTED | TODO                                         |
| Pointer targets meet 24 by 24 CSS px or an allowed exception                            | 2.5.8         | NOT TESTED | WCAG 2.2 AA                                  |

### Understandable

| Check                                                                                | WCAG                | Result     | Evidence / notes                               |
| ------------------------------------------------------------------------------------ | ------------------- | ---------- | ---------------------------------------------- |
| Page language and language changes are programmatically identified                   | 3.1.1, 3.1.2        | NOT TESTED | TODO                                           |
| Focus or input does not trigger unexpected context changes                           | 3.2.1, 3.2.2        | NOT TESTED | TODO                                           |
| Navigation, help, and repeated components are consistent                             | 3.2.3, 3.2.4, 3.2.6 | NOT TESTED | TODO                                           |
| Errors identify the field/problem in text and provide correction suggestions         | 3.3.1, 3.3.3        | NOT TESTED | Force required, format, authz, conflict errors |
| Labels/instructions appear before users commit data                                  | 3.3.2               | NOT TESTED | TODO                                           |
| Destructive, legal, or important submissions can be reviewed, corrected, or reversed | 3.3.4               | NOT TESTED | IEP/workflow transitions especially            |
| Re-entering information is avoided or auto-populated unless exception applies        | 3.3.7               | NOT TESTED | WCAG 2.2 AA                                    |
| Authentication does not require a cognitive-function test without an alternative     | 3.3.8               | NOT TESTED | Include OAuth and password paths if enabled    |

### Robust

| Check                                                                                                                             | WCAG                | Result     | Evidence / notes                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------- | ---------------------------------------------- |
| Custom controls expose correct name, role, value, state, and relationships                                                        | 4.1.2               | NOT TESTED | Inspect accessibility tree                     |
| Status/error/success messages are announced without moving focus unnecessarily                                                    | 4.1.3               | NOT TESTED | Save, validation, loading, logout              |
| Markup does not create duplicate IDs or broken ARIA references                                                                    | 4.1.2               | NOT TESTED | Automated baseline plus manual dynamic states  |
| Tables expose captions/context and row/column headers; responsive alternatives preserve relationships                             | 1.3.1, 4.1.2        | NOT TESTED | Attendance and report tables                   |
| Dialogs/drawers have an accessible name, initial focus, contained focus where modal, Escape/close behavior, and focus restoration | 2.1.2, 2.4.3, 4.1.2 | NOT TESTED | Observation reference drawer and confirmations |

### Motion and user preferences

| Check                                                                                  | WCAG / expectation                    | Result     | Evidence / notes                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------- | ---------- | ------------------------------------------------- |
| `prefers-reduced-motion: reduce` removes or substantially reduces non-essential motion | 2.3.3 advisory / platform expectation | NOT TESTED | Test drawers, toasts, loading, route/view changes |
| Essential progress remains understandable when animation is reduced                    | 4.1.3                                 | NOT TESTED | TODO                                              |
| Windows High Contrast / forced colors retains operation and focus visibility           | 1.4.11                                | NOT TESTED | TODO                                              |
| Light/dark or browser color preferences do not hide content if supported               | 1.4.3, 1.4.11                         | NOT TESTED | TODO                                              |

## Findings

| ID       | Criterion | Workflow/state | Severity | Steps and evidence | Expected / actual | Owner | Target | Status |
| -------- | --------- | -------------- | -------- | ------------------ | ----------------- | ----- | ------ | ------ |
| A11Y-001 | TODO      | TODO           | TODO     | TODO               | TODO              | TODO  | TODO   | OPEN   |

## Exceptions and blocked checks

| Check | Reason | Risk | Owner | Resolution date / risk acceptance |
| ----- | ------ | ---- | ----- | --------------------------------- |
| TODO  | TODO   | TODO | TODO  | TODO                              |

## Review conclusion

Do not mark this section complete until every core workflow has evidence and every critical/high finding is resolved or explicitly accepted by an authorized owner.

- Critical blockers open: TODO
- High blockers open: TODO
- Other known findings: TODO
- Blocked/not-tested scope: TODO
- Reviewer conclusion: **NOT PROVIDED**
- Product/security/operations acceptance: **NOT PROVIDED**
