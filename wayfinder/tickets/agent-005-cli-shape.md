---
id: agent-005
title: Decide whether --install is a flag on the existing command or needs a subcommand
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Ticket 005 (original CLI-design map) decided a single-command shape with no subcommands, explicitly noting "subcommands (e.g. `init` for config scaffolding) are added later if a real need shows up." An installer that writes files to the target project — a fundamentally different action from `tenets [path]`'s read-only analysis — may be exactly that real need.

Decide: does `--install` stay a flag on the main `tenets` command (e.g. `tenets --install`, doing nothing else when passed — no `path` analysis happens), or does this warrant introducing a subcommand (e.g. `tenets install`), revisiting Ticket 005's "no subcommands" stance for the first time since it was made? If a flag: does it conflict with or take priority over `--help` (which already short-circuits before analysis)? If a subcommand: what does that mean for the CLI's `parseArgs`, which currently only handles flags, not a subcommand-router shape.

## Resolution (2026-08-10)

**Subcommand: `tenets install`.** This is the CLI's first subcommand, formally revisiting Ticket 005's "no subcommands... added later if a real need shows up" stance — installing files into the target project is judged a semantically distinct-enough action from read-only analysis to warrant it, rather than folding it into the flag pattern `--help` already established.

Implementation implications for `parseArgs`/`runCli`, to guide (not pre-empt) the actual `/tdd` work:
- `tenets [path] [options]` (no subcommand) keeps its current meaning — analyze, as today.
- `tenets install` routes to the install action instead of treating `install` as a path. Requires a routing check ahead of today's flag-only parsing (e.g. `argv[0] === 'install'`).
- `--help`/`-h` still short-circuits first, regardless of subcommand — `tenets install --help` shows the (still-general, not install-specific) help text; no dedicated per-subcommand help system for v1.
- **Known, accepted edge case**: a literal directory named `install` becomes ambiguous with the subcommand (`tenets install` would route to the installer, not analyze a directory called `install`). Not solved specially for v1 — matches long-standing precedent in git/npm/most CLIs with subcommands, where the subcommand always wins and disambiguating a same-named path requires an explicit `./install` or similar.
