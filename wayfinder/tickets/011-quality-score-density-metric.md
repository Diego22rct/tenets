---
id: 011
title: Decide whether to add a code-quality score (findings per total LOC)
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: []
---

## Question

Should tenets compute and report a code-quality score derived from findings-per-total-lines-of-code, alongside (or instead of) the raw findings list? If yes: how is it calculated (which findings count, weighted by severity or not, per-file or whole-run), what does it look like in each output format, and does it affect the exit-code/`--fail-on` contract (Ticket 005) or is it purely informational?

## Resolution (2026-08-11)

- **Weighting**: severity-weighted, not a flat count. Default weights `info=1, warning=3, error=5` (mirrors the existing `SEVERITY_ORDER` tiering in `src/cli/run.ts`, spread out enough that a handful of errors visibly outweighs a pile of infos).
- **Granularity**: global only for v1 — one number per run, no per-file breakdown. Keeps it consistent with the rest of v1's output surface (Ticket 005); per-file scores can be added later without breaking this if a real need shows up (YAGNI).
- **Formula/display**: raw density, not a letter grade — `weighted findings per 1000 LOC` (weighted sum of findings ÷ total analyzed LOC × 1000), shown with one decimal (e.g. `2.4 findings/KLOC`). Avoids inventing arbitrary A–F cutoffs now; a grading scale can layer on top later once real-world numbers exist to calibrate against.
- **Exit code**: purely informational for v1. Does not touch the `0`/`1`/`2` exit-code contract or `--fail-on` (Ticket 005) — shown in both `terminal` and `json` output as an additional field/line, no new flag. A `--min-score`-style gate is a natural future ticket if wanted, not built now.
- **Denominator note**: "total analyzed LOC" means lines from files actually analyzed (excludes `skippedFiles`), to avoid understating density when files fail to parse.
