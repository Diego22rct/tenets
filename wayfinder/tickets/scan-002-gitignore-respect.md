---
id: scan-002
title: Decide whether/how to respect .gitignore by default
type: wayfinder:grilling
status: open
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
