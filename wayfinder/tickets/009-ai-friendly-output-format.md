---
id: 009
title: Research how to make CLI output AI-friendly (LLM/agent hand-off)
type: wayfinder:research
status: closed
assignee: diego
blocked_by: []
---

## Question

The current `terminal` and `json` formats (`src/cli/run.ts`) were designed for a human reading a terminal and for generic machine consumption, not specifically for an AI agent consuming the output (e.g. Claude Code running `tenets` after a coding task, per the `install` subcommand's agent rule). What does "AI-friendly" output mean concretely for a static-analysis CLI, and what should change?

Investigate:
- How other static-analysis / lint tools shape output for LLM/agent consumption (e.g. structured JSON schemas with stable field names, machine-parseable summaries, `--format` conventions in ESLint, Biome, ruff, tsc, etc.).
- Whether the gap is the *shape* of existing formats (JSON verbosity/structure, terminal readability) or a missing dedicated format (e.g. a `markdown`/`agent` format — already flagged as deferred fog in Ticket 005's resolution and the map's "Not yet specified" section).
- Concrete, actionable recommendations: field names/structure, whether findings should be grouped/summarized differently, whether file:line references need a different shape for an agent to act on them, token-efficiency tradeoffs.

Resolve with a research subagent; findings feed a follow-up decision (grilling) on what to actually change.

## Findings (2026-08-11)

Surveyed how comparable tools (ESLint, Biome, Ruff, GitHub CLI) and general agent-tooling guidance shape output for LLM consumption:

- **Dedicated machine format, distinct from human terminal output.** Ruff ships `--output-format github` (and others) purely for machine consumers; ESLint/SARIF tooling exists specifically so LLM plugins don't have to scrape human text. tenets already has this split (`terminal` vs `json`) — the gap is that `json` is just `JSON.stringify(result)` of the internal `AnalysisResult`/`Finding` shape, not a schema designed to be read by an agent.
- **Token efficiency matters concretely.** Guidance from agent-CLI writeups: a `--raw`/compact flag stripping indentation/whitespace can cut output ~40%, directly extending how much an agent can act on per turn. tenets's `JSON.stringify(result, null, 2)` is pretty-printed (2-space indent) — good for humans, wasteful for agents reading it as tool output.
- **Errors as road signs, not stop signs.** For agent consumers, failures should explain what went wrong and what to do next, not just fail. tenets's exit-code-2 path (`analyze` throw) currently collapses to a bare `tenets: failed to analyze '<path>'` string with no detail — an agent can't self-correct from that.
- **Group/summarize, don't just dump a flat list.** Agent-facing tool output benefits from grouping (e.g. by file or rule) plus a leading summary line/count, so an agent can decide "how bad is this" in one read before deciding whether to drill into individual findings — tenets's terminal format already ends with a count, but doesn't group; JSON has no summary at all, just the raw array.
- **Predictable, stable field names over ad-hoc types.** The `install`-command scenario (agent reads output after every coding task) makes tenets's own JSON schema itself a de facto machine format already relied on by agents — worth treating `AnalysisResult`/`Finding` as a stable public contract rather than "whatever the internal type happens to be," or introducing a distinct `--format agent`/`--format compact` that isn't just internal-json-stringify.

**Where the actual gap is**: not a missing dedicated markdown/PR-comment format (that's a separate, still-deferred CI question) — it's that the *existing* `json` format is an unshaped internal dump rather than an agent-oriented contract, and the `terminal` format's error path gives an agent nothing to act on. Concrete candidates for the follow-up decision: (1) compact/non-pretty-printed JSON option, (2) group findings by file with a summary header in both formats, (3) surface the underlying error (not just a generic failure string) in the exit-2 path, (4) treat `Finding`'s field names as a versioned/stable contract.

Sources: [awesome-ai-friendly-cli](https://github.com/alies-dev/awesome-ai-friendly-cli), [Ruff Open CLI](https://opencli.co/cli/ruff), [Designing CLI Tools for AI Agents](https://archit15singh.github.io/posts/2026-02-28-designing-cli-tools-for-ai-agents/), [Rethinking CLI interfaces for AI](https://www.notcheckmark.com/2025/07/rethinking-cli-interfaces-for-ai/), [Writing CLI Tools That AI Agents Actually Want to Use](https://dev.to/uenyioha/writing-cli-tools-that-ai-agents-actually-want-to-use-39no)
