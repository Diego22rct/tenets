---
id: 001
title: Choose the AST parsing foundation
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

The decision so far is "build the AST analyzer from scratch" rather than orchestrating existing linters/duplication tools. But that leaves open: does "from scratch" mean using the raw TypeScript Compiler API (`typescript` package) directly, or is a thin ergonomic wrapper over it (e.g. ts-morph) acceptable — since it provides no rule logic itself, just traversal/query ergonomics over the same compiler API?

Resolve:
- Raw Compiler API vs. a thin wrapper library, and why.
- The shared traversal/query utility layer every rule will be built on top of (how a rule gets "all function declarations", "all imports", "all exported symbols", etc. without duplicating boilerplate per rule).
- How multiple tsconfig roots (monorepo case) are loaded and kept isolated from each other during a single analysis run.

Constraint (added 2026-08-08): the user wants to keep the door open for non-TS/JS languages later (out of scope to build now — see map's Out of scope). Design the shared traversal/query layer and the rule-facing data shapes so they aren't hard-wired to TypeScript Compiler API types where avoidable — e.g. rules should consume a language-agnostic intermediate representation (function/class/import facts) rather than raw `ts.Node`s directly, if that's achievable without over-engineering v1.

## Resolution (2026-08-08)

- **Library**: raw TypeScript Compiler API (`typescript` package), no wrapper. Consistent with the "build from scratch" preference — no third-party AST-ergonomics dependency, full control over the extraction layer.
- **Data layer**: a single upfront pass per source file builds a language-agnostic IR ("fact database" — functions, classes, imports, exports, JSX/framework markers, etc.), extracted from the raw `ts.Node` tree. Rules consume only the IR, never raw `ts.Node`s directly. This is the seam the future multi-language goal (see map Notes) hangs off: a non-TS parser would just need to produce the same IR shape.
- **Monorepo handling**: discover every `tsconfig.json` in the target tree (glob / workspace-aware), create one isolated `ts.Program` per discovered root, analyze each independently, then merge findings at the end. A malformed/misconfigured package can't take down analysis of the others.

Note: the concrete IR schema (what fields a "Function fact", "Import fact", etc. actually carry) is *not* decided here — graduated into a new ticket, see map's Decisions so far.
