---
type: wayfinder:map
tracker: local-markdown
created: 2026-08-10
---

# Map: `tenets --install` — agent-integration guidance installer

## Destination

A concrete design for a `tenets --install` CLI flag that installs agent-integration guidance (not a new server or protocol) into a target project, so AI coding agents (Claude Code, Codex CLI, etc.) know how and when to invoke the already-published `tenets` CLI and how to interpret its output. Covers: which agents/formats are supported, what content gets installed, where it's written, how existing files are handled (merge/overwrite/skip), and whether this fits as a flag on the existing single-command CLI shape (Ticket 005) or needs a subcommand. Reaching the end means every one of those questions is decided — implementing `--install` itself is separate follow-up work (default "plan, don't do" posture, not overridden).

## Notes

Domain: CLI installer/config-generation feature; AI coding agent tooling conventions (Claude Code's `CLAUDE.md`/skills, Codex CLI's equivalent, possibly others).

Trigger (2026-08-10): user asked for "integración con agentes de IA (Claude Code, Codex, etc.)". The original CLI-design map already scoped a full MCP server as explicitly out of scope / a separate future effort ("Longer-term direction: wrap the core engine as an MCP server... building the MCP server itself is out of scope for this map"). Grilled to confirm: this map takes the lighter path instead of finally building that MCP server — teach *existing* agents to invoke the *existing*, already-published CLI (`npx @diego22rct/tenets`), rather than standing up new server infrastructure. No new protocol/server work here.

Standing preferences (confirmed 2026-08-10):
- Destination shape: an installer (`--install`), not a new server. The MCP server option was explicitly declined in favor of this lighter path.
- Agents in scope by name: Claude Code, Codex CLI ("etc." — open to more if research surfaces obvious, low-cost additions, but not a mandate to cover every agent tool that exists).

Skills to consult: none installed for `/grilling`/`/domain-modeling`/`/research` in this environment — substituting direct conversation and general-purpose research agents, same fallback used on this project's three prior maps.

## Decisions so far

- [Research Claude Code's and Codex CLI's project-level agent-instruction conventions](tickets/agent-001-conventions-research.md) — Claude Code reads `CLAUDE.md` (always-loaded) and `.claude/skills/<name>/SKILL.md` (on-demand procedures); Codex CLI reads `AGENTS.md`. **Critical finding**: `AGENTS.md` is now a real cross-tool standard read by Codex, Cursor, Windsurf, Aider, Copilot, Gemini CLI, Devin, Zed and more — but Claude Code explicitly does *not* read it natively, recommending a `@AGENTS.md` import bridge inside `CLAUDE.md` instead. Neither tool has a formal action-vs-context schema; both treat their file as advisory prose (Claude Code's actual enforcement mechanism is hooks, not memory files).
- [Decide which agents/formats --install targets and what file(s) it writes for each](tickets/agent-002-target-agents-and-formats.md) — `AGENTS.md` + `CLAUDE.md` (the latter as a bridge), both written unconditionally (no agent-detection logic). The actionable rule lives directly inline in both files — no separate Claude-Code-only skill artifact, so every targeted agent gets the same real instruction, not just Claude Code.
- [Decide what content the installed guidance actually contains](tickets/agent-003-installed-content.md) — final rule text locked in: concrete command (`npx @diego22rct/tenets [path]`) plus a short severity/exit-code interpretation guide, identical in both `AGENTS.md` and `CLAUDE.md`. Trigger: after finishing a coding task or before committing. Framing: advisory (alert the user), not a hard gate.
- [Decide how --install handles files that already exist](tickets/agent-004-existing-file-handling.md) — create if missing, append if present; idempotency via exact-text match (skip if the rule block is already there verbatim), no delimiter/marker convention for v1. Known tradeoff accepted: a future wording change to the rule would append a second block rather than replacing the first, since exact-match won't recognize differently-worded old content.
- [Decide whether --install is a flag on the existing command or needs a subcommand](tickets/agent-005-cli-shape.md) — subcommand: `tenets install`, the CLI's first, formally revisiting Ticket 005's "no subcommands" stance. `--help` still short-circuits first regardless. Known accepted edge case: a literal directory named `install` becomes ambiguous with the subcommand, same as any subcommand-bearing CLI (git, npm, etc.) — not solved specially for v1.

## Not yet specified

(none)

## Out of scope

- **Building the MCP server.** Explicitly declined in favor of the lighter `--install` approach when naming this map's destination. Remains a separate, undated future effort per the original CLI-design map.
