---
id: 006
title: Define the core-engine/CLI module boundary for future MCP reuse
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

What's the internal architecture split between the analysis engine (parsing, rule execution, findings model) and the CLI presentation layer, such that the engine can be wrapped as an MCP server later (e.g. exposing an `analyze_repo` tool) without restructuring?

Resolve: the engine's public API surface, and the "Finding" data contract it returns (shape that both a terminal formatter and a future MCP tool response can consume unchanged).

Note: this ticket decides the *boundary*, not the MCP server itself — building the server is out of scope for this map (see map's Out of scope section).

Constraint (added 2026-08-08): also keep the boundary compatible with adding non-TS/JS languages later (out of scope to build now). The "Finding" contract and engine entry point should not assume TypeScript-specific inputs beyond what's necessary — e.g. keep language-specific parsing behind an adapter rather than threading TS types through the engine's public API.

## Resolution (2026-08-08)

- **Package structure**: one package, split into internal `src/core` (parsing → IR → rule execution → findings; no knowledge of CLI, terminal, or flags) and `src/cli` (flag parsing, formatters, exit codes — consumes `src/core`'s public API only). Splitting into separate `@tool/core`/`@tool/cli` npm-workspace packages is deferred until a second real consumer (the future MCP server) exists — no need to pay that cost now.
- **Engine invocation**: a single async entry point, `analyze(options): Promise<AnalysisResult>`. Matches the CLI's already-decided request/response model (Ticket 005's exit-code contract needs a complete result, not a stream) and maps cleanly onto a future MCP tool call (call → await → respond). No streaming API — nothing today needs it.
- **Finding contract**: `{ ruleId, principle (SOLID|DRY|KISS|YAGNI), severity, message, location: { file, line, column }, confidence }`. Kept to essentials only — no `suggestedFix` field yet, since nothing consumes it and adding it later is additive, not breaking.
- **Language-adapter seam** (follows directly from Ticket 001's IR decision, not a new open question): `src/core` operates only on the IR that Ticket 008 will define — it never touches `ts.Node` or the TypeScript Compiler API directly. The TS-specific parsing (Ticket 001) + framework detection (Ticket 002) live behind a `LanguageAdapter`-shaped module that produces IR facts; `analyze()` calls the adapter, then runs rules over its output. v1 registers exactly one adapter (TypeScript); a second language later means writing a new adapter, not touching `src/core`.
