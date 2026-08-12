---
id: vis-001
title: "Decide the color implementation approach (library vs. hand-rolled) and TTY/NO_COLOR detection"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

`tenets` currently has zero runtime dependencies for output formatting (just `ignore` and `typescript`). Node has no built-in cross-version color API usable across the `engines` range (`>=16.20.0` — `util.styleText` only landed in Node 20.12+). Decide:

- Add a small color dependency (e.g. `picocolors` — tiny, zero-dep itself) or hand-roll raw ANSI escape codes for the handful of colors needed (severity tiers + gauge)?
- How is TTY detected (`process.stdout.isTTY`) and where does that check live — inside `formatTerminal`, or does `runCli` decide the format variant and pass a flag down?
- Does a `NO_COLOR` env var / `--no-color` flag override TTY auto-detection, per the ecosystem convention noted in the map's fog?

## Resolution (2026-08-11)

- **Color mechanism**: add `picocolors` as a runtime dependency (~700 bytes, zero deps of its own). Handles Windows legacy-terminal edge cases and color-support detection that hand-rolled ANSI codes would otherwise have to reimplement.
- **TTY detection location**: inside `formatTerminal` (`src/cli/run.ts`) — checks `process.stdout.isTTY` directly at the same level where the rest of the format logic already lives. No new flag threaded through `runCli`.
- **Override**: `NO_COLOR` env var is respected (the de facto ecosystem standard, no-color.org — already followed by git, eslint, etc.), letting someone force plain output even in a real TTY. No `--no-color` flag added yet — YAGNI, add it if someone actually asks. (picocolors respects `NO_COLOR` itself, so this may need no extra code beyond picocolors' own detection — confirm during implementation.)
