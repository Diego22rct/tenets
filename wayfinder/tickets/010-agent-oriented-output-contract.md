---
id: 010
title: Decide the agent-oriented output contract (JSON shape, grouping, error detail)
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Research in [Research how to make CLI output AI-friendly](009-ai-friendly-output-format.md) found the gap isn't a missing format but that the existing `json`/`terminal` output (`src/cli/run.ts`) isn't shaped for an agent consumer: pretty-printed JSON with no summary, no grouping, and a generic error string on the exit-2 path. Decide concretely:

- Should `--format json` become compact (non-pretty-printed) by default, or gain a separate flag/value for it?
- Should findings be grouped (by file? by rule?) with a leading summary in one or both formats, rather than a flat list?
- What should the exit-code-2 (tool error) path surface instead of the current generic `tenets: failed to analyze '<path>'` string — how much of the underlying error is safe/useful to show?
- Should `Finding`/`AnalysisResult`'s field names be explicitly treated as a stable contract (e.g. documented, versioned) given the `install` subcommand already wires agents to read this output directly?

## Resolution (2026-08-11)

- **JSON compaction**: `--format json` becomes compact by default (drops `JSON.stringify(result, null, 2)`'s `indent: 2` — single-line output). No new flag/value; a human wanting it pretty can pipe to a formatter. Applies to both formats going forward — no separate "agent" format introduced.
- **Grouping/summary**: both formats gain a summary header — total finding count plus the density score from [Decide whether to add a code-quality score](011-quality-score-density-metric.md) (`findings/KLOC`) — and findings are grouped by file (not by rule) rather than left as a flat list. Lets an agent decide which files to open without reading every finding first.
- **Error detail (exit code 2)**: the generic `tenets: failed to analyze '<path>'` string is replaced with the real captured error message (`err.message`) and the file that triggered it when known, so an agent has something to act on instead of a dead end. Internal stack traces are not included (avoids leaking absolute paths / implementation detail beyond what's needed to unblock the agent).
- **Stable contract**: `Finding`/`AnalysisResult` field names are documented as a public contract now (a doc comment on the types plus a note in README), even though `install` is currently the only real consumer. Shape changes are a deliberate, version-bumped decision going forward, not an incidental refactor — justified because agents are already wired to read this shape directly, not speculative.

Net effect on `src/cli/run.ts`: `formatJson` drops pretty-printing and adds a summary+grouping wrapper around the existing `Finding[]`; `formatTerminal` gains the same summary/grouping; the `catch` block in `runCli` needs to capture and surface the underlying error instead of discarding it.
