---
id: agent-004
title: Decide how --install handles files that already exist
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [agent-002]
---

## Question

Given agent-002's answer on which file(s) `--install` writes: a target project may already have a `CLAUDE.md`, an existing skill directory, or an equivalent file for another targeted agent — written by the user, unrelated to `tenets`. Decide the collision behavior:

- Overwrite unconditionally (simple, but destroys existing content).
- Append/merge (requires a marker convention — e.g. a delimited section this tool owns and can safely rewrite on a later `--install` re-run without touching the rest of the file).
- Skip and warn (never touch an existing file, tell the user what it would have written and where).
- Something conditional on file type (e.g. a dedicated skill file is fine to own outright since it doesn't exist yet in most projects; a root `CLAUDE.md` is much more likely to be pre-existing and user-owned, warranting a different default).

Also resolve: does re-running `--install` need to be idempotent (safe to run repeatedly without duplicating content), and if so, how is "content this tool previously installed" identified on a second run.

## Resolution (2026-08-10)

**Create if missing, append if present** (confirmed while grilling agent-002): if `AGENTS.md`/`CLAUDE.md` don't exist, `--install` creates them containing the rule text from agent-003. If they already exist, the rule is appended rather than replacing/overwriting the file's existing content.

**Idempotency**: before appending, check whether the file already contains the exact rule text (agent-003's literal block) — if present, skip (no duplicate write). No delimiter/marker convention (e.g. `<!-- tenets:start -->`) for v1 — simpler, exact-text matching is sufficient as long as the rule wording stays stable across tool versions. Tradeoff accepted: if a future `tenets` version changes the rule wording, exact-match detection won't recognize the old text as "already installed," so a re-run would append a second, differently-worded block rather than replacing the first — judged acceptable for v1 rather than building marker-based replace-in-place now.
