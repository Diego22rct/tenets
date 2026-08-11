---
id: fp-003
title: "Decide the fix for yagni/unused-export missing dynamic imports"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
github_issue: https://github.com/Diego22rct/tenets/issues/4
---

## Question

The report scopes this as a v0.4.0 feature, not a patch: full reference resolution for `ImportExpression`/dynamic `import()`, including resolving `.then(m => m.X)` callbacks and `await import()` destructuring to find which exported symbol is actually used. Decide the real scope for v1 of this fix: does it need to resolve arbitrary destructuring/property-access patterns off the dynamic import's promise, or is covering the common lazy-route shapes (`.then(m => m.X)`, `await import(...)` then `.X`) enough for now? Does this require new IR fact kinds (Ticket 008 of the main map only has Import/Export/Call facts for *static* imports), or can dynamic imports be normalized into the existing Import fact kind? Where does "good enough, ship it" end and "still a false positive, not worth the half-fix" begin?

## Resolution (2026-08-11)

- **Coverage for v1**: only the common lazy-route shapes — `import('./x').then(m => m.Y)` and `(await import('./x')).Y` (including `const { Y } = await import('./x')` as the same underlying await-then-property-access pattern). Arbitrary nested destructuring off a dynamic import is not covered; matches the actual case in the report (Angular lazy routes) without open-ended parsing work.
- **IR shape**: a new fact kind, `DynamicImportFact` — kept separate from the static `ImportFact` rather than synthesized into it, so dynamic vs. static origin stays traceable (useful for future rules, e.g. `--format` output eventually distinguishing them). Exact field shape (likely mirrors `ImportFact`'s `{ source, importedNames }` plus enough to identify it as dynamic) is decided during implementation, not specified further here.
- **Rule change**: `src/core/rules/yagni-unused-export.ts` needs to also consume `DynamicImportFact[]` alongside the existing `ExportFact[]`/`ImportFact[]` inputs, folding both static and dynamic imported-name sets together — same simple name-matching logic as today (the existing rule already ignores per-file source resolution, matching by name globally; that behavior is unchanged, just extended to include dynamic import names).
- **Consequence for the report's plan**: confirms this stays a v0.4.0-scale feature (new IR fact kind + new adapter parsing for `ImportExpression`), not a small patch — consistent with what the report itself proposed.
