---
id: scan-003
title: Decide whether .d.ts files should be excluded by default
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

`findSourceFiles`'s extension filter is `.ts`/`.tsx` (`isSourceFileName`), and `.d.ts` files end in `.ts`, so they pass the filter and get scanned. Confirmed by inspection: this very project's own `dist/**/*.d.ts` build output would be scanned if someone ran `tenets .` here.

In practice this is likely harmless for the rule catalog specifically — declaration files have no function bodies (`node.body` is always absent), so none of the 8 v1 rules (all of which key off `FunctionFact`/`ClassFact` bodies or export/import matching) should produce meaningful findings from a pure `.d.ts` file. But it's wasted parsing work, and `yagni/unused-export` in particular might misbehave on ambient declarations (worth checking empirically, not assuming).

Decide: exclude `.d.ts` explicitly (and if so, whether that's independent of or folded into scan-001's hardcoded list / scan-002's `.gitignore`/build-dir exclusion), or leave as-is if the investigation confirms it's genuinely inert.

## Resolution (2026-08-10)

**Yes, exclude `.d.ts` files by default.** Confirmed empirically (by code inspection, not just reasoning): the risk is real, not hypothetical. `collectFunctionDeclaration` is correctly gated by `node.body`, so ambient `declare function` never produces facts — but `collectClassDeclaration` has no such guard, so an ambient `export declare class Foo {...}` still produces a `ClassFact` + `ExportFact` (only its bodyless methods are skipped, via `collectClassMethods`'s own `!member.body` check). Since the tool has no type-level usage tracking (only value-level import matching), `yagni/unused-export` and `yagni/single-impl-interface` would very likely misfire on ambient classes specifically.

With scan-001's `dist`/`build` exclusion already in place, the remaining `.d.ts` exposure is mostly hand-authored ambient files (e.g. this project's own `jsx.d.ts` fixture) — which have no function bodies at all, so 6 of the 8 rules structurally can't apply to them regardless; only the 2 export-tracking rules were ever at risk, and this closes that gap directly.

**Implementation**: extend `isSourceFileName` to exclude names ending in `.d.ts` specifically (checked before the general `.ts` suffix match, since `.d.ts` is also a `.ts` suffix match). Separate future `/tdd` work, not done in this wayfinder session.
