---
id: ts7-003
title: Decide whether to migrate to TypeScript 7 now or stay on 5.x
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [ts7-001, ts7-002]
---

## Question

Given the findings from the API-capability research (ts7-001) and the packaging/distribution research (ts7-002): does `@diego22rct/tenets` migrate its parsing foundation to TypeScript 7 now, or stay on TypeScript 5.x (the current, working, Ticket-001-chosen baseline) and revisit later?

If "migrate now": this ticket's resolution should also scope what graduates next — likely one or more new tickets sketching the rewritten adapter's target architecture (API mapping, traversal approach, sync/async channel usage, performance considerations), added to this map's frontier once this ticket closes.

If "stay on 5.x": the map closes here. Revisiting TS7 later is a fresh future effort, not a resumption of this map.

## Resolution (2026-08-10)

**Migrate now**, scoped deliberately to `typescript/unstable/ast` (the syntax layer ts7-001 found capability-complete for this adapter's usage) — explicitly *not* `typescript/unstable/sync`'s `Program`/`Checker` type-system features, which is where the rest of the ecosystem (typescript-eslint, ts-morph, ts-jest) is still stuck. Accepted risk: per ts7-001, Microsoft states TS7.0's API isn't stable and 7.1 will ship "a new (and different) API" with no announced date — this migration may need to be redone at 7.1. Packaging risk (ts7-002) was judged acceptable (~2.3x compressed size increase on first `npx` run per machine, no unusual CI risk, no extra manifest work needed).

Graduates: the rewritten adapter's target architecture (API mapping, batching/lifecycle for the spawned native process, error handling) — see the new ticket this resolution creates.
