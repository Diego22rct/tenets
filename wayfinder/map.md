---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-08
---

# Map: SOLID/DRY/KISS/YAGNI static analysis CLI for HonoJS + Next.js

## Destination

A concrete architecture + v1 rule catalog for a from-scratch, TypeScript-Compiler-API-based CLI tool that statically analyzes HonoJS and/or Next.js codebases (monorepo or standalone) for SOLID/DRY/KISS/YAGNI violations, with the core analysis engine cleanly separated from the CLI so it can be exposed as an MCP server later without a rewrite. The map is done when every architectural/design decision needed to start implementing v1 is resolved — the code itself is built afterward, guided by the resolved tickets.

## Notes

Domain: static analysis / AST tooling for TypeScript, targeting HonoJS (backend) and Next.js (frontend) conventions.

Standing preferences (confirmed 2026-08-08 via grilling):
- Build the AST engine from scratch — do not orchestrate existing linters/duplication tools (ESLint, dependency-cruiser, jscpd) as the analysis backbone.
- Must support both monorepo (multiple packages/tsconfigs) and standalone single-repo layouts — the target codebase varies.
- `C:\Dev\tools\best-practices` is where the tool itself is built; it is **not** the codebase being analyzed (that lives elsewhere, TBD per use).
- Longer-term direction: wrap the core engine as an MCP server. Keep that boundary in mind architecturally (see the module-boundary ticket), but building the MCP server itself is out of scope for this map (see Out of scope).
- Longer-term direction: support languages beyond TS/JS (confirmed 2026-08-08). Not built now, but the parsing foundation and the core-engine/CLI boundary must be designed so adding another language later doesn't force a rewrite (e.g. don't bake TypeScript-Compiler-API types into the shared rule-execution contract if avoidable). Building actual support for another language is out of scope for this map (see Out of scope).

Skills to consult while resolving tickets: `grill-me` for design decisions. `tdd` once implementation starts — that's after this map, not part of it.

## Decisions so far

- [Choose the AST parsing foundation](tickets/001-ast-parsing-foundation.md) — raw TypeScript Compiler API (no wrapper); single-pass language-agnostic IR ("fact database") that rules consume instead of raw `ts.Node`s; one isolated `ts.Program` per discovered `tsconfig.json`, findings merged after.
- [Design framework-detection heuristics for Hono and Next.js code](tickets/002-framework-detection-heuristics.md) — hybrid signal (usage is source of truth, path is a pre-filter); Hono handlers found by tracing `app.get/post/...` calls on a `Hono` instance (same-file only for v1); Next.js classified primarily by its own path convention (`app/**/route.ts`, `page.tsx`, `pages/api/**`) plus content signals (`"use client"`, exported HTTP methods); unclassified code defaults to generic-rule analysis, never silently skipped.
- [Decide CLI surface and output formats](tickets/005-cli-surface-output-formats.md) — single command (no subcommands) with `--format`/`--config`/`--fail-on` flags; terminal + JSON output for v1 (markdown deferred, tied to CI fog); exit codes `0`/`1`/`2` distinguish "clean", "violations found", and "tool error".
- [Define the core-engine/CLI module boundary for future MCP reuse](tickets/006-core-cli-module-boundary.md) — one package, internal `src/core`/`src/cli` split (workspace split deferred to when a second consumer exists); engine is a single async `analyze(options): Promise<AnalysisResult>`; minimal `Finding` contract (ruleId, principle, severity, message, location, confidence); TS-specific parsing lives behind a `LanguageAdapter` seam so `src/core` never touches `ts.Node` directly.
- [Decide package identity and distribution](tickets/007-package-identity-distribution.md) — name `@diego22rct/tenets` (unscoped `tenets` taken on npm); published to npm, run via `npx @diego22rct/tenets <path>`; `npm link` for pre-publish development.
- [Design the IR/fact schema for parsed code](tickets/008-ir-fact-schema.md) — content-addressed fact ids (`file:line:col`); framework classification attaches inline via a `frameworkRole` field, not a parallel index; v1 fact kinds are File, Import, Export, Function (carries a normalized body signature for DRY), Class, and Call (carries same-file-resolved callee, enabling Hono handler tracing and DIP's "direct instantiation" signal as ordinary rules over the IR).
- [Define the v1 rule catalog for SOLID, DRY, KISS, YAGNI](tickets/003-rule-catalog-v1.md) — 8 rules ship in v1: `srp/function-length`, `srp/class-method-count`, `dip/direct-instantiation`, `dry/exact-duplicate`, `kiss/cyclomatic-complexity`, `kiss/nesting-depth`, `yagni/unused-export`, `yagni/single-impl-interface`. Three-tier severity (info/warning/error, `error` unused in v1) + fixed per-rule confidence (high/medium/low). OCP/LSP/ISP deferred (see Out of scope). Numeric thresholds themselves left to Ticket 004.
- [Design the config & threshold schema](tickets/004-config-threshold-schema.md) — `tenets.config.ts` via a typed `defineConfig()` helper, built-in defaults for every rule so the tool runs zero-config; schema is `{ rules, ignore, overrides }` with a single ESLint-style `overrides` array for monorepo per-package settings (no nested config files); monorepo *root discovery* stays owned by Ticket 001, not duplicated here; concrete default thresholds set per rule (e.g. 50 LOC, complexity 10, nesting 4).
- [Research how to make CLI output AI-friendly](tickets/009-ai-friendly-output-format.md) — gap isn't a missing format (markdown/PR-comment output stays deferred), it's that the existing `json`/`terminal` output isn't shaped for an agent consumer: unshaped pretty-printed JSON, no grouping/summary, and a generic error string on failure. Candidates handed to Ticket 010.
- [Decide whether to add a code-quality score (findings per total LOC)](tickets/011-quality-score-density-metric.md) — yes: severity-weighted (`info=1, warning=3, error=5`), global-only (no per-file breakdown) for v1, shown as raw density `findings/KLOC` (no letter grade) in both output formats, purely informational — doesn't touch the exit-code/`--fail-on` contract.
- [Decide the agent-oriented output contract](tickets/010-agent-oriented-output-contract.md) — `--format json` becomes compact by default (no pretty-print); both formats gain a summary header (count + `findings/KLOC` score) with findings grouped by file instead of a flat list; exit-code-2 path surfaces the real error message + file instead of a generic string; `Finding`/`AnalysisResult` field names documented as a stable public contract.

## Not yet specified

- How rule accuracy will be validated/tuned against real-world code samples (false positive/negative tolerance) — depends on the rule catalog and parsing foundation being settled first. Includes a known gap: Hono handler detection only resolves identifier references within the same file (Ticket 002), so cross-file-registered handlers won't be classified until this is tuned.
- Whether/how the tool integrates into CI (GitHub Action, pre-commit hook) beyond the bare CLI — deliberately deferred; may become tickets, or get ruled out of scope, once the v1 CLI shape exists.
- Extensibility/plugin model for adding new rules over time.
- JSX / server-vs-client component nuances in the Next.js app router, and Hono-specific patterns (middleware composition, RPC client) that may need bespoke handling — will sharpen once framework-detection and rule-catalog tickets resolve.
- The eventual MCP server's tool surface itself (tool names, params, output shape) — the natural next horizon once the module-boundary ticket resolves, but not part of this destination.

## Out of scope

- **Building and shipping the MCP server wrapper.** Explicitly deferred by the user ("quizás poder hacerlo MCP luego"). This map's destination is the CLI tool's design and v1 scope only; the architecture must stay compatible with an MCP wrapper (see the module-boundary ticket) but standing it up is a separate future effort.
- **Building actual support for languages other than TS/JS.** Explicitly deferred by the user (confirmed 2026-08-08). v1 destination is TS/JS (HonoJS + Next.js) only; the parsing foundation and core-engine/CLI boundary must stay compatible with adding another language later (see Ticket 001 and Ticket 006) but implementing another language's analyzer is a separate future effort.
- **OCP, LSP, and ISP static checks.** Decided while resolving Ticket 003 (2026-08-09): the current IR (Ticket 008) lacks the fact kinds (switch-statement facts, full interface facts) and type-flow analysis these three would need for anything better than a noisy proxy. v1's rule catalog covers SRP, DIP, DRY, KISS, and YAGNI only; adding OCP/LSP/ISP later is a separate future effort, not a v1 gap to fill now.
