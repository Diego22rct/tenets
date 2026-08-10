---
id: scan-003
title: Decide whether .d.ts files should be excluded by default
type: wayfinder:grilling
status: open
assignee: diego
blocked_by: []
---

## Question

`findSourceFiles`'s extension filter is `.ts`/`.tsx` (`isSourceFileName`), and `.d.ts` files end in `.ts`, so they pass the filter and get scanned. Confirmed by inspection: this very project's own `dist/**/*.d.ts` build output would be scanned if someone ran `tenets .` here.

In practice this is likely harmless for the rule catalog specifically — declaration files have no function bodies (`node.body` is always absent), so none of the 8 v1 rules (all of which key off `FunctionFact`/`ClassFact` bodies or export/import matching) should produce meaningful findings from a pure `.d.ts` file. But it's wasted parsing work, and `yagni/unused-export` in particular might misbehave on ambient declarations (worth checking empirically, not assuming).

Decide: exclude `.d.ts` explicitly (and if so, whether that's independent of or folded into scan-001's hardcoded list / scan-002's `.gitignore`/build-dir exclusion), or leave as-is if the investigation confirms it's genuinely inert.
