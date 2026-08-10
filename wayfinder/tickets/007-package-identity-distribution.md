---
id: 007
title: Decide package identity and distribution
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

What's the tool's name, package structure (single package vs. a small monorepo of its own if engine/CLI/future-MCP end up as separate packages), and how will it be installed/run — npm global install, `npx`, local devDependency per analyzed project, or a single compiled binary?

## Resolution (2026-08-09)

- **Name**: `tenets`, scoped as **`@diego22rct/tenets`** — the unscoped name is already taken on npm (confirmed via registry lookup), and a personal scope is the standard fix, no need to bikeshed a different name.
- **Package structure**: single package (already decided in Ticket 006 — `src/core`/`src/cli` split internally, not separate npm packages).
- **Distribution**: published to the public npm registry, run via `npx @diego22rct/tenets <path>` against any target repo — no install step, always latest version, matches the "built here, run against repos elsewhere" setup from the map's Notes. During development (pre-first-publish), use `npm link` to exercise it against real repos without publishing yet.
