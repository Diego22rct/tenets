---
id: agent-002
title: Decide which agents/formats --install targets and what file(s) it writes for each
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [agent-001]
---

## Question

Given agent-001's findings on Claude Code's and Codex CLI's actual project-level instruction-file conventions (and whatever other agents it surfaced as comparably well-documented): decide the concrete target list for `tenets --install` — which agent(s) it supports, and for each, the exact file(s) it writes, in what format, at what path.

Resolve whether `--install` writes for all detected/supported agents unconditionally, or only for agents it detects are actually in use in the target project (e.g. presence of a `.claude/` directory), and what "not detected" means for the CLI's behavior (skip silently, write anyway as a default, prompt/flag-controlled).

## Resolution (2026-08-10)

**Files: `AGENTS.md` + `CLAUDE.md`**, per agent-001's finding — `AGENTS.md` covers Codex/Cursor/Windsurf/Aider/Copilot/Gemini CLI/Devin/Zed natively; `CLAUDE.md` bridges Claude Code (which doesn't read `AGENTS.md`). Explicitly **not** a separate `.claude/skills/tenets/SKILL.md` — the user wants the actionable rule embedded directly in both `AGENTS.md`/`CLAUDE.md` (a short instruction: after finishing a coding task or before committing, run `tenets` and alert the user to findings), not deferred to a Claude-Code-specific skill artifact only some agents could load. Exact rule wording is agent-003's scope, not this ticket's.

**Always write, not conditional on agent detection.** Both files get written unconditionally — no check for whether Claude Code or a specific AGENTS.md-reading tool is actually in use in the target project. `AGENTS.md` is a general enough standard that this needs no detection logic to justify; `CLAUDE.md` is small enough that writing it even when Claude Code isn't in use costs nothing (matches the originally-recommended option; the user's answer proceeded straight to file-existence handling without objecting to this, treating unconditional writing as a given).

**Note for agent-004 (existing-file handling) and agent-003 (content)**: the user's answer to this ticket's grilling also directly answered both of those — captured verbatim in each ticket's body as a pointer, to be formally confirmed/closed in a future session rather than re-asked from scratch.
