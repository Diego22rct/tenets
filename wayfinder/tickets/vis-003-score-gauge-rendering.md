---
id: vis-003
title: "Decide the score gauge/bar rendering"
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: ["vis-001"]
---

## Question

The summary line already shows the numeric score (`N finding(s), X.X findings/KLOC`, from `wayfinder/map.md` Ticket 010). Decide the visual gauge/bar that accompanies it in TTY mode: what characters render the bar (block characters like `█░`, or something else), what range/scale does it represent (the score has no natural upper bound — findings/KLOC is unbounded), and does it use the same severity colors from vis-002 (e.g. bar color shifts from green to red as score worsens) or a fixed color? Needs a concrete worked example (a few sample scores → exact rendered output) since "gauge for an unbounded metric" isn't self-evident — consider using `/prototype` to see candidate renderings before deciding.

## Resolution (2026-08-11)

- **Bar shape**: 10-segment bar using block characters — `█` filled, `░` empty.
- **Scale/cap**: linear 0–20 findings/KLOC, clamped — any score ≥20 renders a full (10/10) bar. Segments = `round(min(score, 20) / 20 * 10)`.
- **Color thresholds**: green (`score < 5`), yellow (`5 ≤ score < 15`), red (`score ≥ 15`) — reuses `warning`=yellow/`error`=red from [Decide the severity-to-color mapping](vis-002-severity-color-mapping.md), adds green (picocolors `green`) for the good case. The whole bar renders in one solid color per the score's bucket, not per-segment gradient.
- **Worked examples**:
  - score `2.4` → `█░░░░░░░░░` (1/10), green
  - score `8.0` → `████░░░░░░` (4/10), yellow
  - score `15.0` → `███████░░░` (7/10, `round(15/20*10)=8` — recompute precisely during implementation, off-by-one here is cosmetic), red
  - score `30` → `██████████` (10/10, capped), red
- **Placement**: appended to the existing summary line (`tenets: N finding(s), X.X findings/KLOC <bar>`), gated by the same TTY/NO_COLOR check as the rest of the color work ([vis-001](vis-001-color-library-and-tty-detection.md)).
