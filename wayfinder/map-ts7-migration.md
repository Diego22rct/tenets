---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-10
---

# Map: Migrate typescript-adapter.ts off the classic TS Compiler API to TypeScript 7

## Destination

A decision on whether `@diego22rct/tenets` migrates its parsing foundation from TypeScript 5.x's classic Compiler API to TypeScript 7's new API surface (`typescript/unstable/ast` + the sync/async channel to the native compiler) — or stays on TypeScript 5.x for now. If the decision is to migrate, the map also produces a concrete target architecture for the rewritten adapter (how `createSourceFile`/`forEachChild`/the `isXxx` guards/`canHaveModifiers` map onto the new API, how the sync/async channel is used, what changes for performance/packaging) — enough to hand off to implementation. If the decision is not to migrate now, the map closes there; no architecture work follows. Actually rewriting `typescript-adapter.ts` is implementation, not part of this map (default "plan, don't do" posture, not overridden).

## Notes

Domain: Node.js/TypeScript tooling, specifically the TypeScript Compiler API surface consumed by `src/core/adapter/typescript-adapter.ts`.

Trigger (2026-08-10): attempting a routine `npm install typescript@latest` bump (to 7.0.2, confirmed via npm registry `dist-tags.latest`) broke the build. `node_modules/typescript`'s `"exports"` map no longer exposes the classic API (`createSourceFile`, `forEachChild`, `SyntaxKind`, the `isXxx` type guards, `canHaveModifiers`/`getModifiers`) via `"."` — that now resolves to `./lib/version.cjs` (just a version string). TS7 ships the real compiler as native platform binaries (`optionalDependencies`: `@typescript/typescript-win32-x64`, `-linux-x64`, `-darwin-arm64`, etc. — the "tsgo" Go-based rewrite), reached from JS via new subpath exports explicitly namespaced `typescript/unstable/*` (`/unstable/ast`, `/unstable/ast/is`, `/unstable/ast/factory`, `/unstable/ast/utils`, `/unstable/ast/scanner`, `/unstable/ast/visitor`, `/unstable/sync`, `/unstable/async`, `/unstable/fs`, `/unstable/proto`). A first look at `dist/ast/is.d.ts` shows similarly-shaped helpers (`isStatement`, `isExpression`, etc.) but real parsing appears to go through a sync/async RPC-style channel to the native binary (`dist/api/sync/api.js`, `syncChannel.js`, `proto.js`), not a plain in-process function call.

Standing preferences (confirmed 2026-08-10):
- Destination shape: decision (migrate now vs. stay on 5.x) plus, if "migrate", the target architecture — not just a bare go/no-go.
- Working assumption (not yet explicitly grilled, flag if wrong): whatever the outcome, the adapter's external contract — the `ParsedFacts`/`FunctionFact`/`ClassFact`/`CallFact`/`ExportFact`/`ImportFact` shapes consumed by `analyze()` and the rules — is not up for redesign here. This map is about replacing the parsing *engine* underneath, not the IR it produces.
- The repo was reverted to `typescript@^5.6.3` (last known-good, matches Ticket 001's original choice) so work continues on a working build while this map is resolved.

Skills to consult: none installed for `/grilling`/`/domain-modeling`/`/research` in this environment — substituting direct conversation and general-purpose research agents, same fallback used on the original CLI-design map.

## Decisions so far

- [Research whether typescript/unstable/ast supports our adapter's actual usage pattern](tickets/ts7-001-unstable-ast-capability-research.md) — technically capability-complete for this adapter's narrow syntax-only usage (all 14 node-kind guards + `SyntaxKind` exist 1:1, `forEachChild` moved from a free function to a `Node` method, `hasExportModifier` actually gets simpler), **but** every parse now crosses an RPC channel to a spawned native binary (no in-process `createSourceFile`; must batch all files into one `updateSnapshot` call or eat a ~14x slowdown), and — the critical risk factor — Microsoft's own TS7.0 announcement states the API is not yet stable and 7.1 will ship "a new (and different) API" with no announced date; the wider ecosystem (typescript-eslint, ts-morph, ts-jest) is uniformly in "not ready yet" posture, not "migrated successfully."
- [Research packaging/distribution implications of TypeScript 7's native binaries](tickets/ts7-002-native-binary-packaging-research.md) — the platform-binary distribution mechanism itself is sound and standard (same pattern as esbuild/@swc/core/sharp), and requires zero extra manifest work from `@diego22rct/tenets`. Real costs: ~2.3x compressed/~1.3x unpacked install size over `typescript@5.x` on every machine's first `npx` run (cached after), no special CI/Docker risk beyond what's already systemic to native-binary npm packages (and structurally *better* than sharp/@swc/core on the musl/Alpine axis, since TS7's binaries appear to be CGO-free static Go builds — not independently verified against the actual binary). One live, unresolved npm 11.x `npx`-specific arborist crash bug (npm/cli#9506) exists for this exact dependency shape but didn't reproduce in testing here. This packaging risk is independent of ts7-001's finding — even if packaging is judged acceptable, ts7-001 found there's currently no stable in-process API to build the adapter against at all.
- [Decide whether to migrate to TypeScript 7 now or stay on 5.x](tickets/ts7-003-go-no-go-decision.md) — **migrate now**, scoped deliberately to `typescript/unstable/ast` (the syntax layer, capability-complete per ts7-001) and explicitly not `typescript/unstable/sync`'s `Program`/`Checker` features (where the rest of the ecosystem is stuck). Accepted risk: may need a second migration at TS7.1 given Microsoft's own "not yet stable, 7.1 will be different" statement.
- [Design the rewritten adapter's target architecture](tickets/ts7-004-rewritten-adapter-architecture.md) — batch all files into one `updateSnapshot({ openFiles: string[] })` call per `parseFacts()` run (no file-content reading needed by the adapter anymore); one `API` instance per run, closed in a `finally`; all 9 `ts.forEachChild` sites become `node.forEachChild(cb)`; `canHaveModifiers`/`getModifiers` dropped for direct `node.modifiers` access; `toLocation`/`getText`/`getStart`/`getEnd` need no changes (confirmed identical signatures). New confirmed behavior change: a file that fails to resolve now returns `undefined` instead of throwing (classic API never did this) — decided to track it via a new `skippedFiles: string[]` field on `ParsedFacts`/`AnalysisResult` (a real contract change from Ticket 006's original shape) rather than silently dropping it, surfaced by the CLI, and to be TDD'd as new behavior during implementation.

## Not yet specified

(none)

## Out of scope

(none yet)
