---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-11
---

# Map: Fix v0.3.1 false-positive report (3 rules)

## Destination

Decide the exact fix approach for each of the 3 false positives from the `tenets_false_positives_report.md` (2026-08-11, tested against Angular's `ASMS.Front`): `dip/direct-instantiation` flagging native globals, `yagni/single-impl-interface` counting external/framework interfaces, and `yagni/unused-export` missing dynamic imports. The map is done when each fix's exact scope/mechanism is decided — implementation (and the version bump: patch for the first two, feature for the third per the report's own plan) happens afterward.

## Notes

Domain: same static-analysis CLI as the main architecture map (`wayfinder/map.md`) — rule engine at `src/core`, rules operate over the IR from Ticket 008 of that map. This map only covers these 3 reported bugs, not new rule design.

Source report: `C:\Users\diego\Downloads\tenets_false_positives_report.md` — each ticket links the corresponding GitHub issue, which carries the report's proposed root cause and solution.

GitHub issues (this repo, `Diego22rct/tenets`):
- [dip/direct-instantiation flags Web API / native global constructors](https://github.com/Diego22rct/tenets/issues/2)
- [yagni/single-impl-interface counts external/framework interfaces](https://github.com/Diego22rct/tenets/issues/3)
- [yagni/unused-export ignores dynamic imports in lazy routes](https://github.com/Diego22rct/tenets/issues/4)

Skills to consult while resolving tickets: `grill-me` for design decisions.

## Decisions so far

- [Decide the fix for dip/direct-instantiation flagging native globals](tickets/fp-001-dip-direct-instantiation-native-globals.md) — symbol resolution against TS ambient types (`lib.dom`/`lib.es*`), not just a bigger hardcoded list; existing `EXCLUDED_CALLEES` set stays as a fast-path fallback. Requires extending the IR (`CallFact` currently has no scope/symbol info) — this is no longer a same-day patch as the source report assumed; exact IR field shape left to implementation.
- [Decide the fix for yagni/single-impl-interface counting external interfaces](tickets/fp-002-yagni-single-impl-interface-external.md) — heuristic over the existing `ImportFact.source` (relative specifier = local, bare specifier = external, no import = local declaration); barrel re-exports are traced (not accepted as an edge case), requiring a new `source` field on `ExportFact` for `export { X } from 'y'` re-export declarations. Slightly more than a pure rule-file patch.
- [Decide the fix for yagni/unused-export missing dynamic imports](tickets/fp-003-yagni-unused-export-dynamic-imports.md) — covers common lazy-route shapes only (`.then(m => m.Y)`, `await import()` + property access), not arbitrary destructuring; new `DynamicImportFact` IR kind (kept separate from static `ImportFact`) feeding into the existing name-matching logic in `yagni-unused-export.ts`. Confirms this stays v0.4.0-scale, not a patch.

## Not yet specified

- Whether the two "patch" fixes (native-globals allowlist, external-interface filtering) and the "feature" fix (dynamic-import resolution) ship together or as separate releases — likely settles naturally once all 3 tickets resolve, not a decision to force now.

## Out of scope

- New rules or rule redesign beyond fixing these 3 reported false positives — that's the main architecture map's territory (`wayfinder/map.md`), not this one.
