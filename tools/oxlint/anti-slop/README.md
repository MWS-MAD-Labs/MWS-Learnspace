# anti-slop (vendored)

Generic Oxlint rules vendored from https://github.com/dmmulroy/anti-slop (MIT licensed,
see LICENSE in this directory). Effect-specific rules and tests were omitted since this
project does not depend on Effect. Registered via `jsPlugins` in `oxlint.config.ts`.

`oxlint.config.ts` enables the rules that pass on the current repository so CI can
prevent new violations immediately. The remaining vendored rules are intentionally
available but disabled until their existing findings are remediated; enable them one
at a time as the baseline is tightened.

To refresh: re-clone the upstream repo and diff `src/{index.ts,rules,shared,vendor}`
against this directory.
