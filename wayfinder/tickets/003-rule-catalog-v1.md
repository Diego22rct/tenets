---
id: 003
title: Define the v1 rule catalog for SOLID, DRY, KISS, YAGNI
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [008]
---

## Question

For each principle, what concrete, statically-checkable signal(s) will v1 actually detect? E.g.:

- **SRP**: files/classes/functions exceeding N responsibilities or LOC/complexity.
- **OCP / LSP / ISP / DIP**: which of these are even feasible to check statically without type-flow analysis, and what's the cheapest useful proxy for each (e.g. DIP: direct `new ConcreteClass()` construction of a dependency vs constructor/param injection)?
- **DRY**: near-duplicate code blocks above a similarity threshold — what similarity algorithm and threshold?
- **KISS**: cyclomatic complexity / nesting-depth ceilings.
- **YAGNI**: unused exports, dead code, speculative generic abstractions (e.g. unused generic type params, single-implementation interfaces).

Resolve: which checks ship in v1 vs explicitly deferred, the severity/confidence model per finding (hard fail vs warning vs info), and how each rule's output maps to the "Finding" data shape used by later tickets (config schema, CLI output).

## Resolution (2026-08-09)

**Severity/confidence model**: three severity tiers (`info | warning | error`) and a `confidence` (`high | medium | low`) fixed per rule as a static default — not computed per-finding. `error` is reserved, unused by any v1 rule (all v1 checks are heuristic proxies, not unambiguous certainties); `warning` is used by the mechanical/high-confidence checks, `info` by the more debatable/heuristic ones. `severity` feeds directly into `--fail-on` (Ticket 005).

**v1 rule catalog** (8 rules across SRP, DIP, DRY, KISS, YAGNI — OCP/LSP/ISP deferred, see Out of scope):

| ruleId | principle | signal (over the Ticket 008 IR) | severity | confidence |
|---|---|---|---|---|
| `srp/function-length` | SRP | `FunctionFact.loc` above threshold | warning | medium |
| `srp/class-method-count` | SRP | `ClassFact.methodIds.length` above threshold | warning | medium |
| `dip/direct-instantiation` | DIP | `CallFact.isNewExpression` inside a class method, callee not on a built-in/value-type exclusion list (Date, Map, Set, Array, Error, RegExp, etc.) | info | medium |
| `dry/exact-duplicate` | DRY | ≥2 `FunctionFact`s sharing the same `normalizedBodySignature`, above a minimum body-size floor (skip trivial one-liners) | warning | high |
| `kiss/cyclomatic-complexity` | KISS | `FunctionFact.cyclomaticComplexity` above threshold | warning | high |
| `kiss/nesting-depth` | KISS | `FunctionFact.nestingDepth` above threshold | warning | high |
| `yagni/unused-export` | YAGNI | `ExportFact` with no matching `ImportFact` anywhere in the analyzed set; exempts a package's declared entry point (`package.json` `main`/`exports`) from the check by default, since nothing in-repo is expected to import its own public barrel | warning | medium |
| `yagni/single-impl-interface` | YAGNI | an interface named in exactly one `ClassFact.implementsInterfaces` across the analyzed set | info | low |

Every finding maps 1:1 onto the `Finding` contract from Ticket 006: `ruleId`, `principle`, `severity`, `confidence`, `message` (rule-specific, generated from the fact's own fields), `location` (copied straight from the triggering fact's `Location`).

**Deferred out of v1**: numeric thresholds themselves (LOC ceiling, complexity ceiling, etc.) are *not* decided here — they're defaults to be set in Ticket 004 (config & threshold schema), which is now unblocked. The `new`-expression exclusion list for `dip/direct-instantiation` is likewise a default/config concern, not fixed here.
