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

## Not yet specified

(none yet — frontier below covers everything currently in view)

## Out of scope

- **The full `tenets.config.ts` config-file system** (custom `ignore` globs, per-glob `overrides`) — already designed in Ticket 004, never implemented; a separate future effort, not rebuilt here.
