---
id: vis-002
title: "Decide the severity-to-color mapping"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: ["vis-001"]
---

## Question

Once the color mechanism is decided (vis-001), what color does each severity tier (`info`, `warning`, `error`) render as, and what (if anything) gets colored besides the `[severity]` tag itself — the rule id, the file path, the whole line? Follow common CLI/linter convention (e.g. ESLint's red/yellow) unless there's a reason to diverge.

## Resolution (2026-08-11)

- **Mapping**: `error` = red, `warning` = yellow, `info` = cyan (picocolors' `red`/`yellow`/`cyan`). Cyan chosen over dimmed/gray for info — three clearly distinct colors, and cyan is the common "informational" color in CLIs (npm, git status).
- **Scope**: only the `[severity]` tag itself is colored (e.g. `pc.red('[error]')`). The rest of the line — rule id, file:line, message — stays plain text, matching ESLint/most linters' convention: color guides the eye without saturating longer reports.
- **Implementation note**: applies to the terminal-format finding lines built in `formatFindingsByFile` (`src/cli/run.ts`), gated by the TTY/NO_COLOR check decided in [Decide the color implementation approach and TTY/NO_COLOR detection](vis-001-color-library-and-tty-detection.md).
