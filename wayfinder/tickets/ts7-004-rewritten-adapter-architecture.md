---
id: ts7-004
title: Design the rewritten adapter's target architecture (API mapping, batching/lifecycle, error handling)
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [ts7-003]
---

## Question

Given the decision to migrate `src/core/adapter/typescript-adapter.ts` to `typescript/unstable/ast` (ts7-003), and the concrete API facts from ts7-001 (all 14 node-kind guards + `SyntaxKind` exist 1:1; `ts.forEachChild(node, cb)` becomes `node.forEachChild(cb)` at all 7 current call sites; `canHaveModifiers`/`getModifiers` are replaced by direct `node.modifiers` access; there's no in-process `createSourceFile` — parsing requires `new API(options)` → `updateSnapshot({ openFiles })` → `program.getSourceFile(file)`, and a naive per-file `updateSnapshot` call is ~14x slower than batching all files into one call) — design the concrete target architecture:

1. **Batching strategy**: `findSourceFiles(rootPath)` already collects the full file list up front. How does that list feed a single `updateSnapshot({ openFiles: [...] })` call — does `openFiles` need file contents inline, or just paths (letting the native process read from disk itself)? What's the resulting per-file retrieval loop shape?
2. **`API` instance lifecycle**: created once per `parseFacts()` call (matching the ~171ms one-time spawn cost) — where does it get created/threaded through/disposed? Does `parseFile`/`collectNodeFacts`/the handler functions need to change signature to receive it, or does the batching collapse `parseFile` into `parseFacts` directly?
3. **Error handling**: today `findSourceFiles`'s `fs.statSync` throwing on a missing path is what produces the CLI's exit-code-2 tool-error path (via `runCli`'s try/catch around `analyze()`). Does the new `API`/`updateSnapshot`/`getSourceFile` flow throw in equivalent ways for a missing path, an unparseable file, or a spawn failure (native binary missing/incompatible platform) — and does that still surface correctly as exit code 2?
4. **Call-site rewrite scope**: confirm the mechanical rewrite list (7 `forEachChild` call sites, all `ts.isXxx`/`ts.SyntaxKind` references switching import source, `hasExportModifier` simplification) is complete and nothing else in `typescript-adapter.ts` depends on classic-API-only behavior.
5. **Test impact**: the existing 15 tests are all black-box at the `analyze()`/`runCli()` seams (confirmed seams from the TDD work) — confirm the rewrite is expected to keep all of them green with no test changes, since the adapter's output contract (`ParsedFacts`/fact shapes) isn't changing, only the parsing engine underneath.

This ticket produces the architecture; implementing it is a separate follow-up effort (this map's destination is the design, not the code).

## Resolution (2026-08-10)

Grounded against the actual TS7 API types (`dist/api/sync/api.d.ts`, `dist/api/proto.d.ts`, `dist/ast/ast.d.ts`) in an isolated scratch install, plus two live probes run against the real package (`probe.mjs`/`probe2.mjs` from ts7-001, and a new `probe-errors.mjs` written for this ticket).

**1. Batching strategy.** `openFiles` on `updateSnapshot` takes `DocumentIdentifier[]` = `(string | { uri: string })[]` — plain file-path strings, confirmed via `proto.d.ts`. **No file content needs to be read or passed by the adapter at all** — the native process does its own filesystem I/O. This is actually a simplification versus today's adapter, which calls `fs.readFileSync` per file before parsing. New shape:
```ts
const files = findSourceFiles(rootPath);           // unchanged
const snapshot = api.updateSnapshot({ openFiles: files });  // one batched call
for (const file of files) {
  const project = snapshot.getDefaultProjectForFile(file);
  const sourceFile = project?.program.getSourceFile(file);
  // see point 3 for the undefined case
}
```
No tsconfig is required — confirmed both by the doc comment ("Otherwise the file is loaded into the inferred project") and empirically in ts7-001's probes.

**2. `API` instance lifecycle.** One instance per `parseFacts()` call: created at the top, used for the single batched `updateSnapshot`, closed via `api.close()` in a `finally` before `parseFacts` returns. Matches the current one-process-per-`tenets`-run model exactly — no change to when the parsing cost is paid, just what it's spent on (one ~171ms native-process spawn instead of N in-process parses).

**3. Error handling — a real, confirmed behavior change, not just a mechanical port.** Empirically verified (`probe-errors.mjs`): `updateSnapshot` does **not** throw for a file that can't be resolved — `getDefaultProjectForFile`/`getSourceFile` return `undefined` instead. This is new: classic `ts.createSourceFile` never returns undefined, even for garbage input. Root-path validation is unaffected — `findSourceFiles`'s `fs.statSync(rootPath)` still throws `ENOENT` synchronously for a bad root path (confirmed), so `runCli`'s existing try/catch → exit code 2 path is untouched.

Decision: **track and report skipped files**, not silent skip. `ParsedFacts` (and `AnalysisResult`) gain a `skippedFiles: string[]` field — file paths where `getSourceFile` returned `undefined`. This is a contract change from Ticket 006's original minimal `AnalysisResult` shape; the CLI's terminal/JSON formatters should surface it (e.g., "3 files could not be analyzed"). Implementation should TDD this as new behavior — no existing test exercises it, and it didn't exist before this migration.

**4. Call-site rewrite scope — corrected count from the ticket's estimate.** Actual grep of `typescript-adapter.ts` found **9** `ts.forEachChild` call sites (not 7), each becoming `node.forEachChild(cb)` — `forEachChild` moved from a free function to a `Node` method (ts7-001), confirmed still true at every site including the nested-closure ones (`computeNestingDepth`, `computeCyclomaticComplexity`, `computeNormalizedBodySignature`). All `ts.isXxx` guards, `ts.SyntaxKind`, `ts.canHaveModifiers`/`ts.getModifiers` become named imports from `typescript/unstable/ast` (guards/`SyntaxKind` 1:1 per ts7-001; `canHaveModifiers`/`getModifiers` are dropped in favor of direct `node.modifiers` access, confirmed via `ModifiersBase` in `ast.generated.d.ts`). Additionally confirmed unchanged and needing **no** rewrite: `Node.getStart(sourceFile?)`, `Node.getEnd()`, `Node.getText(sourceFile?)`, `SourceFile.getLineAndCharacterOfPosition(position)` — all present with identical signatures in the new `ast.d.ts`, so `toLocation` and every name-resolution call site are untouched beyond the import source. The single `ts.createSourceFile` call site is replaced by the batched `API`/`updateSnapshot`/`getSourceFile` flow from point 1.

**5. Test impact.** The 15 existing tests (all black-box at the `analyze()`/`runCli()` seams) are expected to stay green with no changes, since `ParsedFacts`'s existing fields and every rule's behavior are unaffected — only the parsing engine underneath changes. The one exception is the new `skippedFiles` field (point 3): implementation should add a new test for it (a fixture with an unparseable/missing file, asserting it shows up in `skippedFiles` and the rest of the analysis still completes) — new behavior needs a new red-green cycle, not a retrofit onto existing tests.
