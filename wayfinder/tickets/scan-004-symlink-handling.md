---
id: scan-004
title: Research symlink handling in the directory walk
type: wayfinder:research
status: closed
assignee: diego
blocked_by: []
---

## Question

`findSourceFiles` recurses via `fs.readdirSync(path, { withFileTypes: true })`, checking `entry.isDirectory()`/`entry.isFile()`. Package managers (pnpm especially, increasingly common — `factulift-frontend` uses `pnpm-workspace.yaml`) make heavy use of symlinks inside `node_modules` and sometimes for monorepo package linking.

Resolve, with evidence (not assumption):
1. Does `Dirent.isDirectory()`/`isFile()` follow symlinks by default on Node, or report the symlink's own type? (This determines whether a symlinked directory gets recursed into at all.)
2. If a symlink points to an ancestor directory (or otherwise creates a cycle), can `findSourceFiles`'s unbounded recursion infinite-loop or stack-overflow? Construct an actual reproduction, don't just reason about it abstractly.
3. Could a symlink whose target is named something other than "node_modules" cause node_modules content to be scanned indirectly, bypassing the `entry.name === 'node_modules'` check (which matches on the symlink's own name in the parent directory, not its target)?

Findings feed scan-001 (whether the exclude check needs to account for symlink targets, not just names) and determine whether a cycle-guard is needed regardless of what gets excluded.

## Resolution (2026-08-10)

Verified empirically on this machine (Windows, non-elevated shell, Developer Mode off — real symlinks require a privilege this environment lacks, so junctions were used instead, which is also what pnpm itself defaults to on Windows for directory links for the same reason).

**Q1 — `Dirent.isDirectory()`/`isFile()` do not follow the link.** They report the entry's own type from the raw directory read (`lstat`-equivalent), not the resolved target. A junction pointing at a real directory reports `{ isDirectory: false, isFile: false, isSymbolicLink: true }`. **Consequence: `findSourceFiles`'s `entry.isDirectory()` check never recurses into any symlinked/junctioned directory today, regardless of name or exclude list.**

**Q2 — no infinite-recursion risk exists, but only as an accidental side effect of Q1.** A constructed symlink cycle (`cycle-root/child/back-to-root` → `cycle-root`) completed instantly against the real `findSourceFiles` logic, because recursion into the junction is never attempted in the first place. A hypothetical variant using `statSync` (which *does* follow links) hit Windows' own `ELOOP` guard after ~40 resolved segments — so even a naive follow-implementation would error out rather than truly hang, but it would still be an uncaught exception today if this ever changes.

**Q3 — no leak, again as a side effect of Q1, not the name check.** A junction named `vendor-alias` pointing at real `node_modules` content did not leak through — but because `entry.isDirectory()` is false for it regardless of name, not because `entry.name === 'node_modules'` caught it.

**Bottom line — the real finding is a completeness gap, not a safety risk.** The current code is accidentally safe (no leaks, no cycles) but at the cost of silently skipping *all* symlinked/junctioned directories — including legitimate pnpm-linked workspace packages, which is exactly how `factulift-frontend` (a real project this tool was tested against) links its own workspace packages. Any monorepo using pnpm/Yarn PnP-style symlinked workspaces is currently invisible to the scanner beyond the top-level packages `findSourceFiles` reaches without crossing a link. This feeds scan-001: the hardcoded-exclude-list question isn't just "what to skip" — there's now also an open "what are we failing to reach at all" question, which is a completeness/correctness concern, not just a scope-tuning one.
