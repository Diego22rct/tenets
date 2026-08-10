---
id: scan-001
title: Decide the hardcoded default exclude list
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Beyond `node_modules` (already excluded), what directories/files should `findSourceFiles` always skip by default, regardless of whether `.gitignore` respect (scan-002) ships? Candidates seen in real projects (including `factulift`, tested earlier): `.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`, `out`, `.vercel`, `.cache`. Resolve the concrete list, and whether it's a fixed constant or has any structure (e.g. exact names vs. patterns).

This is a safety net independent of `.gitignore` — needs an answer even if scan-002 decides not to implement `.gitignore` respect at all.

## Resolution (2026-08-10)

Standard JS/TS-ecosystem exclude list, exact directory-name match (same pattern as the existing `node_modules`/`__fixtures__` check — a `Set<string>` compared against `entry.name`, not glob/pattern matching):

`node_modules` (existing), `.git`, `dist`, `build`, `out`, `.next`, `.turbo`, `coverage`, `.vercel`, `.cache`.

Covers VCS (`.git`), common build-output directory names (`dist`, `build`, `out`), and tooling specific to the HonoJS + Next.js/Turborepo target stack (`.next`, `.turbo`, `.vercel`), plus generic caches and coverage reports. This list applies unconditionally regardless of what scan-002 (`.gitignore` respect) decides — it's a safety net, not a substitute.

`__fixtures__`'s fate is scan-005's decision, not this ticket's — left as-is here, not added to or removed from this list.

Implementation: extend the existing exact-name check in `findSourceFiles` (currently `entry.name === 'node_modules' || entry.name === '__fixtures__'`) into a `Set<string>` membership check against this list. Separate future `/tdd` work, not done in this wayfinder session (this map's Notes didn't override the default "plan, don't do" posture).
