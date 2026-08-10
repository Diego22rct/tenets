---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-10
---

# Map: Default (zero-config) file-discovery scope for `tenets`

## Destination

A concrete, implemented default file-discovery scope for `tenets` when run with no `--config` (the only mode that exists today) — which directories/files `findSourceFiles` excludes by default, including whether `.gitignore` is respected automatically. Reaching the end means every currently-fuzzy exclusion question is either decided-and-implemented or explicitly deferred. The full config-file system (`tenets.config.ts`'s custom `ignore` field and per-glob `overrides`, designed in Ticket 004 but never built) is a separate, already-scoped future effort and stays out of this map.

## Notes

Domain: `findSourceFiles` in `src/core/adapter/typescript-adapter.ts` — the directory walk that decides what counts as "the project" when a path (or no path, defaulting to cwd per Ticket 005) is handed to `tenets`.

Trigger (2026-08-10): user asked whether running `tenets` with no path (→ whole project) correctly excludes `node_modules`. Investigation found:
- `node_modules` **is** already excluded (hardcoded, alongside `__fixtures__`).
- **`.gitignore` is not respected at all**, despite Ticket 004 already deciding "`.gitignore` is respected by default" as part of the config schema design — that decision was never implemented, because config-file loading itself was never built.
- **`.d.ts` files are not excluded** — `findSourceFiles`'s extension filter is `.ts`/`.tsx`, and `.d.ts` ends in `.ts`, so declaration files (e.g. this very project's own `dist/**/*.d.ts` build output) get scanned. Confirmed by inspection, not yet by running.
- No other common build/generated directories (`.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`, `out`) are excluded by default.

Standing preference (confirmed 2026-08-10): scope this map to the zero-config default only. The config-file system stays Ticket 004's separate, already-designed scope — don't rebuild it here.

Skills to consult: none installed for `/grilling`/`/domain-modeling`/`/research` in this environment — substituting direct conversation and general-purpose research agents, same fallback used on the prior two maps for this project.

## Decisions so far

- [Research symlink handling in the directory walk](tickets/scan-004-symlink-handling.md) — no safety risk today (no infinite loops, no accidental node_modules leaks), but only as a side effect of a bigger problem: `Dirent.isDirectory()` never follows symlinks/junctions, so `findSourceFiles` silently skips *every* symlinked directory — including legitimate pnpm-linked monorepo workspace packages (confirmed against the same linking style `factulift-frontend` uses). This is a completeness gap, not just a scope-tuning question, and feeds directly into scan-001.
- [Decide the hardcoded default exclude list](tickets/scan-001-hardcoded-exclude-list.md) — exact-name match (same pattern as the existing `node_modules` check) against `.git`, `dist`, `build`, `out`, `.next`, `.turbo`, `coverage`, `.vercel`, `.cache`, applied unconditionally regardless of `.gitignore` respect (scan-002). `__fixtures__`'s fate stays scan-005's separate decision.
- [Decide whether/how to respect .gitignore by default](tickets/scan-002-gitignore-respect.md) — yes, via the `ignore` npm package (new runtime dependency, same publish scrutiny as `typescript`), scoped to a single root-level `.gitignore` applied globally — not full git-compatible nested `.gitignore` resolution per subdirectory, judged not worth the complexity for v1.
- [Decide whether .d.ts files should be excluded by default](tickets/scan-003-declaration-file-exclusion.md) — yes. Confirmed (by code inspection) that ambient `export declare class` slips through `collectClassDeclaration` (unlike ambient functions, which are correctly body-gated), producing likely-wrong `yagni/unused-export`/`yagni/single-impl-interface` findings since the tool has no type-level usage tracking. Implementation: extend `isSourceFileName` to exclude `.d.ts` specifically.
- [Reconsider whether __fixtures__ belongs in the general-purpose default exclude list](tickets/scan-005-fixtures-exclusion-appropriateness.md) — drop it. Unlike `.git`/`dist`/`node_modules`, `__fixtures__` is this tool's own dev-workflow naming choice, not an ecosystem convention — silently excluding a real user's real directory of that name with no indication anything was skipped is worse than the noise it avoided. Consequence: the dogfood self-check script needs to point at specific non-fixture subdirectories once this ships, since it'll no longer get a free pass on its own fixtures.

## Not yet specified

(none yet — frontier below covers everything currently in view)

## Out of scope

- **The full `tenets.config.ts` config-file system** (custom `ignore` globs, per-glob `overrides`) — already designed in Ticket 004, never implemented; a separate future effort, not rebuilt here.
