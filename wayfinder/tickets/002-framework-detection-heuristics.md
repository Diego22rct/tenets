---
id: 002
title: Design framework-detection heuristics for Hono and Next.js code
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Given an arbitrary scanned file tree (monorepo or standalone), how does the tool identify which files/exports are:
- Hono route handlers / middleware / app instances
- Next.js pages-router pages/API routes vs app-router routes, layouts, server components vs client components

What signals drive detection (import sources like `hono`/`next`, file path conventions like `app/`, `pages/`, `route.ts`, exported function shapes, directives like `"use client"`)? This detection underpins any framework-aware rule (e.g. treating a Hono handler's responsibilities differently from a plain utility function for SRP purposes).

Resolve: the concrete detection rules, and how confidently-unclassified files are handled (skipped vs analyzed as generic code).

Cross-reference: how this classification attaches to a fact is decided in Ticket 008 (IR/fact schema), not here — this ticket only decides the detection logic itself.

## Resolution (2026-08-08)

**General principle**: hybrid signal — real usage (imports + call sites) is the source of truth for *what something is*; file-path convention is used as a cheap pre-filter to narrow which files get the expensive usage analysis, not as the decisive signal on its own. This holds for both frameworks, but plays out differently because Next.js's routing is itself path-based (the framework requires specific filenames/locations to function) while Hono's is not (routes can be registered from anywhere).

**Hono**: track every `new Hono()` (or `new OpenAPIHono()`, etc.) instantiation, then follow `.get/.post/.put/.delete/.patch/.all/.on(...)` calls made on that instance (including chained `.route()` sub-routers). The handler is the last argument at the call site:
- Inline arrow/function expression → classified directly as a route handler.
- Identifier reference → resolved to its declaration **within the same file only** for v1 (cross-file/re-exported handler resolution is a real gap — noted below, not solved here).
Middleware is detected the same way via `.use(...)` calls on a Hono instance.

**Next.js**: path convention is the primary pre-filter here (not just a hint) because Next.js's routing literally requires it:
- `app/**/route.ts(x)` exporting `GET`/`POST`/etc. → app-router route handler (the exported function name confirms it, not just the path).
- `app/**/page.tsx` / `layout.tsx` → app-router page/layout.
- Presence (or absence) of a top-of-file `"use client"` directive on an app-router file → client vs. server component.
- `pages/api/**` default export → pages-router API route; `pages/**` (excluding `api/`) default export → pages-router page.

**Unclassified files/exports**: default to being analyzed as generic code (general DRY/KISS/YAGNI rules apply) rather than skipped — nothing silently drops out of analysis. A user can explicitly exclude paths later via ignore patterns (Ticket 004, config schema).

**Known gap carried forward**: same-file-only handler resolution for Hono means a handler defined in one file and re-exported/registered from another won't be classified. This is a tuning/accuracy concern, already covered by the existing "Not yet specified" item on rule-accuracy validation — not a new ticket.
