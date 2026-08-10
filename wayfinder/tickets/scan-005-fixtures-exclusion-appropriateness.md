---
id: scan-005
title: Reconsider whether __fixtures__ belongs in the general-purpose default exclude list
type: wayfinder:grilling
status: open
assignee: diego
blocked_by: []
---

## Question

`__fixtures__` was added to `findSourceFiles`'s hardcoded exclude list specifically so this tool's own self-analysis (the dogfood self-check) wouldn't be polluted by its own intentionally-violating test fixtures (see the `code-review`/`simplify` session that added it). But this exclude list is not self-analysis-only — it's the same `findSourceFiles` used for every `tenets` invocation, including analyzing arbitrary third-party codebases.

`__fixtures__` is not a reserved or unusual directory name — other projects could legitimately use it for real source (e.g. a directory of fixture *data* that happens to include real `.ts` helper/type files, or just an unrelated project using that name for something else entirely). Excluding it unconditionally for every analyzed project is a default that leaked from this tool's own development needs.

Decide: keep as a general default (if the risk of a name collision in third-party projects is judged negligible), scope it more narrowly (e.g. only relevant to this tool's own self-analysis, not a general default), or drop it from the general path and let scan-001/scan-002's answers cover the general case instead.
