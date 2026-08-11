---
id: fp-002
title: "Decide the fix for yagni/single-impl-interface counting external interfaces"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
github_issue: https://github.com/Diego22rct/tenets/issues/3
---

## Question

The report proposes only evaluating interfaces declared locally in the analyzed project (skip any `implements` target whose declaration isn't a project-local `InterfaceDeclaration`). Decide the exact detection mechanism: does the current IR (Ticket 008 of the main map) already resolve an `implements` clause's identifier to its declaring file/module, or does this need new IR support? Should "external" mean "resolves outside the analyzed path set" (works for any package, not just `node_modules`) or specifically "resolves into `node_modules`"? Any edge case to settle now — e.g. an interface re-exported from a local barrel file that originates externally?

## Resolution (2026-08-11)

- **Mechanism**: heuristic over the existing `ImportFact` (`source`, `importedNames`) — no full module resolution needed. For each interface name in `ClassFact.implementsInterfaces`, look up its import in the same file: no matching `ImportFact` → declared locally (local, evaluate for YAGNI); matching `ImportFact` with a relative `source` (starts with `.`/`/`) → local (evaluate); matching `ImportFact` with a bare specifier (package name, e.g. `@angular/core`) → external (skip). Implementation touches `src/core/rules/yagni-single-impl-interface.ts`, which needs `ImportFact[]` added as an input alongside `ClassFact[]`.
- **Barrel re-exports**: traced, not accepted as an edge case. A local barrel (`export { OnDestroy } from '@angular/core'`) re-exporting an external interface must still resolve to "external" when consumed through the barrel. This means `ExportFact` needs a `source` field for re-export declarations (`export { X } from 'y'`) — it currently has none — so the chain can be followed: interface's local import → barrel file's re-export → real origin. This is new IR surface, not just a rule-level heuristic; scope it as part of implementation, exact fact shape decided then.
- **Consequence for the report's plan**: still lands as a "patch," but touches `ExportFact` (new field) in addition to the rule itself — slightly more than a pure rule-file change.
