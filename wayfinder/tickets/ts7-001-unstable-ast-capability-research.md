---
id: ts7-001
title: Research whether typescript/unstable/ast supports our adapter's actual usage pattern
type: wayfinder:research
status: closed
assignee: diego
blocked_by: []
---

## Question

`src/core/adapter/typescript-adapter.ts` uses a specific, narrow slice of the classic TypeScript Compiler API: `ts.createSourceFile(fileName, text, target, setParentNodes)` called per-file with no `ts.Program`/tsconfig involved, `ts.forEachChild` for recursive tree walking, and the type-guard functions `isFunctionDeclaration`, `isClassDeclaration`, `isMethodDeclaration`, `isVariableDeclaration`, `isIdentifier`, `isStringLiteral`, `isNumericLiteral`, `isBlock`, `isArrowFunction`, `isFunctionExpression`, `isNewExpression`, `isBinaryExpression`, `isImportDeclaration`, `isNamedImports`, plus `SyntaxKind`, `canHaveModifiers`/`getModifiers`.

Does `typescript@7`'s `typescript/unstable/ast` (and friends: `/unstable/ast/is`, `/unstable/ast/factory`, `/unstable/ast/utils`, `/unstable/ast/scanner`, `/unstable/ast/visitor`, `/unstable/sync`, `/unstable/async`) support this same usage shape?

Specifically resolve:
1. Is there a synchronous, in-process way to parse a single file's source text into a Node tree — an equivalent of `createSourceFile` — or does every parse now cross the sync/async RPC channel to the native binary? What's the latency/architecture model for calling this repeatedly across potentially hundreds of files in a target codebase?
2. Does `typescript/unstable/ast` (via `is.generated.ts` or elsewhere) expose the same specific node-kind guards listed above, 1:1, or a different/renamed set?
3. Is there a `forEachChild`-equivalent for recursive traversal?
4. What does Microsoft say (official docs, blog posts, the TypeScript repo's own migration guidance, README) about the "unstable" label's meaning in practice — is there a stated stability timeline, known-breaking-changes-are-expected warning, or is it closer to "stable but not yet marked as such"? Does TypeScript 5.x continue to receive support/security patches, and for how long?
5. Any known issues, open GitHub discussions, or blog posts from other tool authors (ESLint, Prettier, ts-morph, etc.) about migrating parser integrations to TS7's new API?

Findings should let the go/no-go ticket (ts7-003) make an informed call, and — if the answer is "yes, this is viable" — give enough detail to sketch what the rewritten adapter would look like.

## Resolution (2026-08-10)

Verified against an isolated `typescript@7.0.2` install in a scratch directory (project's own `node_modules` untouched), by reading the shipped `.d.ts` files under `dist/ast/` and `dist/api/`, and by writing and running two probe scripts against the real package.

**Q1 — no in-process `createSourceFile` equivalent; every parse crosses an RPC channel to a spawned native binary.** The package's `"."` export is just a version string; all compiler functionality lives under `/unstable/*`. `dist/api/syncChannel.d.ts` documents `SyncRpcChannel` spawning a child process and talking to it synchronously over stdin/stdout pipes — "both sides (this JS channel and the Go child process) must be built from the same tree." The only path to a `SourceFile` is `new API(options)` → `updateSnapshot({ openFiles })` → `program.getSourceFile(file)`; this works without an on-disk tsconfig (falls back to an inferred project), so the "no `ts.Program`" constraint is satisfiable, but not the in-process, RPC-free part.

Measured on this machine: `new API()` costs ~171ms (one-time spawn). Batched (one `updateSnapshot` for 300 files, then 300× `getSourceFile()`): ~71ms total (~0.24ms/file). Naive per-file loop (`updateSnapshot`+`getSourceFile`+dispose per file — a straight port of the current adapter's shape): ~1035ms for 300 files (~3.45ms/file, **~14x slower**), confirmed via `getTimingInfo()` showing 901 RPC round-trips vs. 302. **A viable rewrite must batch all files into one `updateSnapshot` call per `parseFacts()` run, not one call per file.**

**Q2 — all 14 node-kind guards the adapter uses exist under identical names** (`isIdentifier`, `isBlock`, `isFunctionDeclaration`, `isClassDeclaration`, `isArrowFunction`, `isNewExpression`, etc.), re-exported from `dist/ast/is.generated.d.ts`. `SyntaxKind` is present with matching member names. `canHaveModifiers`/`getModifiers` don't exist — but this is a simplification, not a gap: modifier-bearing node interfaces now declare `modifiers?: NodeArray<ModifierLike>` directly via a shared `ModifiersBase`, so `hasExportModifier` gets simpler (`node.modifiers?.some(...)`, no guard call needed).

**Q3 — `forEachChild` moved from a free function to an instance method.** No standalone `ts.forEachChild(node, cb)` export exists; instead `Node.forEachChild(visitor)` is a method on every node (verified working at runtime). Mechanical rewrite at all 7 call sites in the adapter, not a capability gap. (`visitEachChild`/`visitNode` from `/unstable/ast/visitor` are transform-oriented, not a fit for read-only traversal.)

**Q4 — the most consequential finding.** Per Microsoft's own TypeScript 7.0 announcement: **"TypeScript 7 does not yet expose a stable programmatic API,"** and **"we expect TypeScript 7.1 to ship with a new (and different) API."** Microsoft's own guidance until then is to keep **TypeScript 6.0** (the last JS-based major, no 6.1 planned, only narrow security/compat patches) running for anything needing the programmatic API, using the native compiler only for fast type-checking. No formal EOL policy exists for any TS version (a 2022 tracking issue asking for one is still open); there's no "5.x survives longer" story specifically — 6.0 is what Microsoft points people to as the bridge during the 7.0→7.1 gap.

**Q5 — the ecosystem is uniformly in "not yet" posture, not "migrated successfully."** typescript-eslint's own tracking issue lists sync/async API mismatches and expects tsgo won't become their primary target "for approximately 1-2 major versions." ts-morph reportedly breaks completely (its deep type-introspection surface has no 7.0-era equivalent). ts-jest breaks on internal APIs the Go compiler doesn't expose yet. The recurring community pattern: run TS7 only as a fast non-blocking checker, keep TS 6.x as the source of truth for tooling. No report found of a load-bearing production migration of a parser-integration tool onto `/unstable/ast` yet.

**Bottom line:** technically viable for this adapter's narrow syntax-only usage (guards and traversal map over cleanly, `hasExportModifier` gets simpler) — but Microsoft is explicit that 7.0's API isn't stable and 7.1 brings a "different" one with no announced date, so migrating now means budgeting for a second migration pass later. Adds a native-binary dependency (19 optional per-platform packages, ~170ms process-spawn cost) and IPC/serialization overhead not present in the classic API. If migrating is pursued, scope it to the `/unstable/ast` syntax layer only (capability-complete per this research) — not `/unstable/sync`'s `Program`/`Checker` type-system features, which is where the rest of the ecosystem is stuck.
