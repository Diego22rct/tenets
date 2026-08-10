---
id: agent-001
title: Research Claude Code's and Codex CLI's project-level agent-instruction conventions
type: wayfinder:research
status: closed
assignee: diego
blocked_by: []
---

## Question

For each of Claude Code and OpenAI's Codex CLI, resolve with evidence (official docs, not assumption):

1. What file(s) does the tool look for at the project level to receive persistent instructions/context (e.g. Claude Code's `CLAUDE.md` at repo root, and its `.claude/skills/<name>/SKILL.md` skill-file convention with YAML frontmatter)? Exact filename(s), exact location(s), exact expected format (plain markdown vs frontmatter+markdown vs something else).
2. Is there a convention for *tool-specific* guidance — e.g. "when working in this repo, run X command before Y" — or is it all general free-text context the agent reads holistically?
3. Are there other AI coding agent CLIs with a comparable, well-documented, stable convention worth covering alongside Claude Code and Codex CLI (e.g. Cursor's `.cursorrules`/`.cursor/rules`, Windsurf, Aider) — list what you find, but don't treat covering them as mandatory; this is scoping input for a later decision, not a requirement to support everything.
4. For Claude Code specifically: confirm the exact skill-file format (frontmatter fields, required vs optional, how a skill gets invoked/discovered) since this project's own `wayfinder`/`tdd` skills are real examples already in this repo's environment (`C:\Users\diego\.claude\skills\wayfinder\SKILL.md`, etc.) — read one directly rather than relying on general knowledge, to ground the answer in a real, current example.

This feeds a scoping decision (agent-002) on which agents/formats `tenets --install` targets and what exactly it writes for each.

## Resolution (2026-08-10)

**Q1 — file conventions, confirmed with evidence.**
- **Claude Code**: two distinct mechanisms. `CLAUDE.md` — plain markdown, no frontmatter, loaded in full at launch; locations in order: managed policy, `~/.claude/CLAUDE.md` (user), `./CLAUDE.md` or `./.claude/CLAUDE.md` (project, committed), `./CLAUDE.local.md` (personal, gitignored); nested subdirectory `CLAUDE.md` files load on-demand. `.claude/skills/<name>/SKILL.md` — YAML frontmatter + markdown body, loaded only on invocation (not every session). Verified directly against this repo's own `C:\Users\diego\.claude\skills\wayfinder\SKILL.md` and `...\tdd\SKILL.md`: both use only `name` + `description` (wayfinder also has `disable-model-invocation: true`); only `description` is documented as recommended, everything else optional (full field list is long — `when_to_use`, `argument-hint`, `allowed-tools`, `model`, `hooks`, etc.). Claude Code skills follow the open **Agent Skills** standard (agentskills.io); only 6 fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`) are portable outside Claude Code.
- **Codex CLI**: reads **`AGENTS.md`** (plain markdown, no frontmatter). Discovery: `AGENTS.override.md` then `AGENTS.md` (configurable fallback names via `~/.codex/config.toml`), checked at `$CODEX_HOME` (global) and at each directory from git root down to cwd (project), concatenated root-to-leaf, capped at 32 KiB. `codex` CLI has a `/init` command to generate one.
- **CLAUDE.md vs Skill, per Claude Code's own docs**: CLAUDE.md = always-loaded facts/rules; Skill = on-demand multi-step procedure — docs explicitly say "if an entry is a multi-step procedure... move it to a skill."

**Q2 — the critical finding.** `AGENTS.md` is a real cross-tool standard (emerged Aug 2025, now Linux Foundation/AAIF-stewarded), natively read by Codex, Cursor, Windsurf, Aider, Gemini CLI, GitHub Copilot, Devin, Zed, and 20+ others. **Claude Code is explicitly not on that list** — its own docs state "Claude Code reads `CLAUDE.md`, not `AGENTS.md`," and recommend bridging via an `@AGENTS.md` import inside `CLAUDE.md` (or a symlink).

**Q3 — other tools, mostly already converged on AGENTS.md.** Cursor (`.cursor/rules/`, legacy `.cursorrules`), Windsurf (`.windsurf/rules/`, `.windsurfrules`), Aider, GitHub Copilot (`.github/copilot-instructions.md`), Cline (`.clinerules`) — all now largely also reading `AGENTS.md` per the Q2 list.

**Q4 — no formal action-vs-context schema in either tool.** Both treat their file(s) as prose the model interprets holistically; there's no imperative-command syntax. Claude Code's actual enforced-action mechanism is **hooks** (`settings.json`) — docs describe them as what to use when something "must run at a specific point... regardless of what Claude decides," implying persistent-memory files (CLAUDE.md/AGENTS.md) are inherently advisory, not enforceable, regardless of wording.

**Implication for agent-002**: writing one `AGENTS.md` (read natively by Codex + most of the ecosystem) plus a minimal `CLAUDE.md` that just does `@AGENTS.md` import (bridging Claude Code to the same content) covers far more ground than writing separate content per tool — worth weighing against a richer, Claude-Code-specific `SKILL.md` for users who want more than the generic bridge.
