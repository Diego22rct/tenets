---
id: fp-001
title: "Decide the fix for dip/direct-instantiation flagging native globals"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
github_issue: https://github.com/Diego22rct/tenets/issues/2
---

## Question

The report proposes a hardcoded `NATIVE_GLOBALS` allowlist (`URL`, `Date`, `Map`, `FormData`, etc.) as the fix for `dip/direct-instantiation` flagging native/Web API constructors. Decide the actual mechanism: hardcoded allowlist (simple, but needs maintenance as new globals appear), symbol resolution against `lib.dom`/`lib.es*` ambient types (more general, but depends on what the current IR (Ticket 008 of the main map) actually captures about symbol origin), or both (allowlist as a fast-path, resolution as a fallback)? Does the current IR have enough information (e.g. a `symbol.isGlobal` equivalent) to do resolution at all, or is that a bigger change than the "patch" this was scoped as in the report?

## Resolution (2026-08-11)

- **Mechanism**: symbol resolution against TS ambient types (`lib.dom`/`lib.es*`), not just a bigger hardcoded list — determines "is this identifier a runtime/ambient global" generally rather than naming every global by hand.
- **Fast-path kept**: the existing `EXCLUDED_CALLEES` set in `src/core/rules/dip-direct-instantiation.ts` stays as a cheap first check (covers the common cases without triggering symbol resolution); resolution is the fallback for anything not in the set.
- **Scope of this ticket**: direction only — symbol resolution requires extending the IR (`CallFact` currently only carries `calleeExpression` as a string with no scope/symbol info per Ticket 008 of the main map). The exact new field/flag shape is left to the implementation session, not specified here.
- **Consequence**: this is no longer a same-day "v0.3.2 patch" as the source report assumed — it's IR work. Flagged for awareness when scheduling against the report's "Plan de Acción" (patch v0.3.2 / feature v0.4.0).
