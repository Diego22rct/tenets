---
id: agent-003
title: Decide what content the installed guidance actually contains
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Independent of which file(s)/format(s) get written (agent-002): what should the installed guidance actually tell an agent? Resolve, at minimum:

- When to invoke `tenets` (e.g. before finishing a task/before a commit, on request, never automatically) — and whether the guidance should express this as a strong instruction or a soft suggestion, given agents vary in how literally they follow project-level instructions.
- How to interpret the output: severity tiers (`info`/`warning`/`error`), the `--fail-on` exit-code contract (0/1/2), and the `--format json` shape (`findings`, `skippedFiles`).
- Whether findings are framed as blocking (must fix before proceeding) or advisory (worth considering, not a hard gate) — this project's own rule catalog (Ticket 003) is explicitly heuristic/proxy-based, not ground truth, which should probably shape the tone.
- Whether to mention concrete example invocations (e.g. `npx @diego22rct/tenets --format json --fail-on error`) directly in the installed content, or keep it high-level and point at the README.

## Note (surfaced while resolving agent-002, 2026-08-10)

While grilling agent-002 (file/format choice), the user gave a direct answer to this ticket's question too: the rule should say, in substance, "after finishing a coding task, or before committing, run the tool and alert the user" — trigger is finish-of-task OR pre-commit (either, not one specific gate), and the framing is advisory ("alertar al usuario" — inform, not block/gate).

## Resolution (2026-08-10)

Confirmed and finalized: the rule includes the **concrete command** (not a generic pointer to the README) and a **short interpretation guide** (severity ordering + exit-code meaning), so an agent can act without a separate lookup. Exact text to embed identically in both `AGENTS.md` and `CLAUDE.md` (per agent-002's resolution):

> After finishing a coding task, or before committing, run `npx @diego22rct/tenets [path]` and alert the user to any findings. Findings are tiered by severity (`info` < `warning` < `error`); an exit code of `1` means violations met the `--fail-on` threshold (default: `warning`) and should be surfaced prominently, not silently ignored.

This is the literal content `--install` writes as the rule line (see agent-004 for how it's inserted into new vs. existing files).
