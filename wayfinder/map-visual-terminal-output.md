---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-11
---

# Map: Visual terminal output for human CLI users

## Destination

Make the default `terminal` format visually richer for a human running `tenets` interactively — color by severity and a score gauge/bar first, more visual elements possibly later — while keeping it byte-for-byte the current plain-text format when stdout isn't a real TTY (piped, redirected, or run by an agent), so nothing that already depends on the current agent-oriented terminal shape (Ticket 010 of `wayfinder/map.md`, the `install` subcommand's agent guidance) breaks. `--format json` is untouched — this map only touches `formatTerminal` in `src/cli/run.ts`. The map is done when the exact mechanism (TTY/NO_COLOR detection, color library choice, severity color mapping, score gauge rendering) is decided — implementation happens afterward via TDD.

## Notes

Domain: CLI terminal output/UX, same codebase as `wayfinder/map.md` (the `tenets` static-analysis CLI). This is a sibling effort to that map's Ticket 010 (agent-oriented output contract) — deliberately kept separate since the audiences and constraints differ (human-interactive vs. agent/CI-consumed), even though both touch `src/cli/run.ts`'s `formatTerminal`.

Standing preference confirmed 2026-08-11 via grilling:
- Auto-detect TTY (`process.stdout.isTTY`) — colors/visual elements only render when stdout is a real terminal; piped/redirected output (the case agents and CI already depend on) stays exactly the current plain-text grouped format. This is the standard CLI convention (git, eslint, etc.) and keeps Ticket 010's decisions intact without a new flag.
- Priority order for visual elements: (1) color by severity, (2) score gauge/bar. Additional elements (per-file/per-rule bar charts) are fog for now, not committed.

Skills to consult while resolving tickets: `grill-me` for design decisions; `/prototype` if a ticket needs to see candidate renderings before deciding.

## Decisions so far

- [Decide the color implementation approach and TTY/NO_COLOR detection](tickets/vis-001-color-library-and-tty-detection.md) — add `picocolors` as a runtime dependency; TTY check lives inside `formatTerminal` directly; `NO_COLOR` env var respected (no `--no-color` flag yet, YAGNI).
- [Decide the severity-to-color mapping](tickets/vis-002-severity-color-mapping.md) — `error`=red, `warning`=yellow, `info`=cyan; only the `[severity]` tag itself is colored, rest of the line stays plain text.
- [Decide the score gauge/bar rendering](tickets/vis-003-score-gauge-rendering.md) — 10-segment `█`/`░` bar, linear 0–20 findings/KLOC scale (clamped above 20); solid color per bucket (green <5, yellow 5–15, red ≥15); appended to the existing summary line.

## Not yet specified

- Whether additional visual elements (a bar chart of findings per file/rule, etc.) get built beyond the two prioritized ones — revisit once color + gauge ship and it's clear what's actually useful.

## Out of scope

- **A TUI (full interactive terminal UI) or HTML report.** Explicitly ruled out during grilling (2026-08-11) — user chose "ASCII bars/color in terminal" over "richer TUI/HTML dashboard". If a richer report is wanted later, that's a separate future effort with its own destination, not a graduation of this map's fog.
- **Changing `--format json`.** Untouched by this map — Ticket 010's JSON contract stands as-is.
