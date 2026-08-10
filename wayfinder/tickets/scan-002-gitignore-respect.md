---
id: scan-002
title: Decide whether/how to respect .gitignore by default
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Ticket 004 already decided "`.gitignore` is respected by default" as part of the config schema design, but that was never implemented — no config-file loading exists yet at all. This ticket re-decides it specifically for the zero-config path (no `tenets.config.ts` involved): does `findSourceFiles` parse and respect `.gitignore` automatically, with no config file present?

If yes, resolve:
- Implementation approach: hand-roll simple pattern matching, or pull in a small dependency (e.g. the `ignore` npm package, the same one ESLint/Prettier use) — a new dependency needs the same publish-readiness scrutiny Ticket 007 gave `typescript` (bundle size, whether it's runtime vs dev).
- Nested `.gitignore` files: monorepos often have per-package `.gitignore` files in addition to (or instead of) a root one. Does the walk need to respect all ancestor/nested `.gitignore` files it encounters, or just a root one?
- What happens with no `.gitignore` file at all (already the common case — e.g. this project didn't have one until Ticket 007's session added a minimal one).

If no (deferred): confirm the hardcoded list from scan-001 is judged sufficient for now, and this becomes explicitly Ticket 004's problem once config-file loading is actually built.

## Resolution (2026-08-10)

**Yes, respect `.gitignore` by default** — scoped to a single `.gitignore` at the analyzed root path (the path handed to `tenets`), applied globally across the whole scan. Not full git-compatible nested/layered `.gitignore` resolution per subdirectory (each subdirectory's own `.gitignore` affecting only its own descendants) — that's a real correctness gap for monorepos with per-package ignore rules, but judged not worth the added complexity for v1 given most projects (including monorepos) keep their primary ignore rules in the root file. Revisit if this proves insufficient in practice.

**Implementation: the `ignore` npm package** (used by ESLint, Prettier, and similar tools for this exact purpose) rather than hand-rolled pattern matching — avoids re-implementing `.gitignore`'s real edge cases (negation patterns, anchoring, wildcards). This is a new **runtime** dependency (used by the adapter itself, not just for building) — needs the same `dependencies` (not `devDependencies`) placement Ticket 007/the TS7 migration already established matters, and the same publish-readiness scrutiny (size, `npm pack --dry-run` check) given to `typescript`.

**No-`.gitignore`-file case**: no additional exclusions beyond scan-001's hardcoded list — same as today's behavior, not a special case to build.

Implementation itself (adding the dependency, wiring it into `findSourceFiles`) is separate future `/tdd` work, not done in this wayfinder session.
