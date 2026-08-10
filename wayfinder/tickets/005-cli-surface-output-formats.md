---
id: 005
title: Decide CLI surface and output formats
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

What are the CLI's flags/subcommands (e.g. `analyze <path>`, `--format`, `--fail-on`)? What output formats are needed — human-readable terminal report, JSON, markdown report (for hand-off to an LLM or a PR comment)? What exit-code contract does it expose so it can be dropped into CI later even though CI integration itself isn't being built now?

## Resolution (2026-08-08)

- **Shape**: single command for v1, no subcommands — `toolname [path] [--format <terminal|json>] [--config <path>] [--fail-on <severity>]`. Path defaults to cwd. Keeps v1 surface minimal (YAGNI-consistent); subcommands (e.g. `init` for config scaffolding) are added later if a real need shows up.
- **Output formats**: terminal (human-readable, default) and JSON (`--format json`, machine-consumable). Markdown output (for PR-comment / LLM hand-off) is deferred — it's tied to the CI-integration question, which is already parked in "Not yet specified".
- **Exit codes**: `0` = ran clean, no violations at/above the fail threshold; `1` = violations found at/above threshold; `2` = tool error (bad config, unparseable file, crash) — distinct from "found problems in your code" so future CI/scripts can tell the two apart. `--fail-on <severity>` selects which severity tier drives exit code `1`, consuming the severity model the rule catalog (Ticket 003) will define.
