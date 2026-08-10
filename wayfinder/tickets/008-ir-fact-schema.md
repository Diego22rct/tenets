---
id: 008
title: Design the IR/fact schema for parsed code
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [001]
---

## Question

Ticket 001 (Choose the AST parsing foundation) decided that a single upfront pass builds a language-agnostic IR ("fact database") which rules consume instead of raw `ts.Node`s. This ticket decides the actual shape of that IR.

Resolve: what fields does each fact kind carry (e.g. a "Function fact" — name, param count, LOC, cyclomatic complexity, containing file/class, is-exported, is-async; a "Class fact"; an "Import fact"; an "Export fact")? How does framework-detected metadata from Ticket 002 (Hono route handler, Next.js server/client component, etc.) attach to a fact — a tag/classification field on the fact, or a separate parallel index keyed by the same fact ids? How is source location (for reporting findings back to the user) carried alongside each fact?

This schema is a prerequisite for the rule catalog (Ticket 003) — rules can't be defined concretely without knowing what data they have to check against.

## Resolution (2026-08-09)

**Shared building blocks**:
- `Location`: `{ file, startLine, startColumn, endLine, endColumn }` — the same shape reused verbatim as `Finding.location` (Ticket 006), so no translation layer between IR and findings.
- **Fact id**: content-addressed, `` `${file}:${startLine}:${startColumn}` `` — deterministic across runs, no counter state, enables comparing two analysis runs later (ties into the rule-accuracy/CI fog item).
- **Framework classification**: attached inline as an optional `frameworkRole` field directly on the relevant fact (e.g. `FunctionFact.frameworkRole = { framework: 'hono'|'nextjs', role: string, confidence: 'high'|'medium' }`) — not a separate parallel index. Rules that care check the field; rules that don't ignore it.

**Fact kinds (v1)**:
- **FileFact**: `id, path, packageRoot` (the owning tsconfig root, Ticket 001), `loc`.
- **ImportFact**: `id, file, source, importedNames[], isTypeOnly, location`.
- **ExportFact**: `id, file, name, kind ('function'|'class'|'const'|'type'|'default'), location`.
- **FunctionFact**: `id, file, name` (or `<anonymous>`), `params: {name, hasTypeAnnotation}[], isExported, isAsync, isArrow, containingClassId?, loc, cyclomaticComplexity, nestingDepth, normalizedBodySignature, frameworkRole?, location`. `normalizedBodySignature` is a token-normalized (identifiers/literals folded) representation of the body, purpose-built so the DRY rule can hash/compare bodies without reading raw source — keeps DRY a pure IR consumer like every other rule.
- **ClassFact**: `id, file, name, isExported, methodIds[], propertyCount, implementsInterfaces[], extendsClass?, location`. `methodIds` references `FunctionFact.id`.
- **CallFact**: `id, file, calleeExpression` (normalized, e.g. `"app.get"`, `"new Hono"`), `isNewExpression, argumentCount, resolvedTargetFunctionId?, location`. `resolvedTargetFunctionId` references a `FunctionFact.id` when the callee resolves to a same-file declaration (per Ticket 002's known same-file-only limitation); left unset otherwise. This is what makes Hono handler tracing (Ticket 002) and DIP's "direct instantiation" signal (Ticket 003, forthcoming) buildable as ordinary rules over the IR instead of special-cased AST access.

Every fact kind is produced by the TypeScript adapter (Ticket 001/006) in the single upfront pass; `src/core` and all rules see only these shapes, never `ts.Node`.
