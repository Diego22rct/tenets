---
id: scan-005
title: Reconsider whether __fixtures__ belongs in the general-purpose default exclude list
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

`__fixtures__` was added to `findSourceFiles`'s hardcoded exclude list specifically so this tool's own self-analysis (the dogfood self-check) wouldn't be polluted by its own intentionally-violating test fixtures (see the `code-review`/`simplify` session that added it). But this exclude list is not self-analysis-only — it's the same `findSourceFiles` used for every `tenets` invocation, including analyzing arbitrary third-party codebases.

`__fixtures__` is not a reserved or unusual directory name — other projects could legitimately use it for real source (e.g. a directory of fixture *data* that happens to include real `.ts` helper/type files, or just an unrelated project using that name for something else entirely). Excluding it unconditionally for every analyzed project is a default that leaked from this tool's own development needs.

Decide: keep as a general default (if the risk of a name collision in third-party projects is judged negligible), scope it more narrowly (e.g. only relevant to this tool's own self-analysis, not a general default), or drop it from the general path and let scan-001/scan-002's answers cover the general case instead.

## Resolution (2026-08-10)

**Drop `__fixtures__` from the general exclude list.** Unlike `.git`/`dist`/`node_modules`/etc. (scan-001), `__fixtures__` is not a recognized ecosystem convention — it's this tool's own dev-workflow naming choice, leaking into behavior applied to every analyzed project. A real user's real project could legitimately have a directory named `__fixtures__` containing real source; silently excluding it from analysis, with no indication to the user that anything was skipped, is a worse failure mode than the noise it was originally added to avoid.

**Consequence to handle at implementation time**: this tool's own `src/core/__fixtures__/` and `src/cli/__fixtures__/` (deliberately full of rule-violating code, used by the test suite) will be scanned by any run pointed broadly at `src/` — including the dogfood self-check script, which currently runs `analyze({ path: 'src/core' })` and would then pick up every fixture's intentional violations as noise. The self-check needs to point at specific non-fixture subdirectories (or equivalent) instead of relying on a built-in exclude once this ships. The test suite itself is unaffected — those tests already point directly at specific fixture subdirectories on purpose.

Implementation itself (removing `'__fixtures__'` from `EXCLUDED_DIRECTORY_NAMES`, adjusting the self-check script) is separate future `/tdd` work, not done in this wayfinder session.
