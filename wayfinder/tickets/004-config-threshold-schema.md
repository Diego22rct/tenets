---
id: 004
title: Design the config & threshold schema
type: wayfinder:grilling
status: closed
assignee: diego
blocked_by: [003]
---

## Question

What does the tool's config file look like? Cover: per-rule enable/disable, per-rule thresholds (e.g. max LOC, complexity ceiling, duplication similarity %), ignore globs, monorepo root/workspace discovery (auto-detect via `pnpm-workspace.yaml`/`turbo.json` vs explicit config), and per-package threshold overrides in a monorepo.

Blocked by the rule catalog (Ticket 003) — the config schema is a per-rule structure, so the rule set needs to exist first.

## Resolution (2026-08-09)

**File & format**: `tenets.config.ts` at the analyzed path's root, default-exporting the result of a `defineConfig()` helper exported by the package (type-safe, autocomplete on rule ids). No `.json` support in v1 — one format, no resolution-precedence question to get wrong. Falls back cleanly: no file found → run entirely on built-in defaults.

**Zero-config by default**: every rule from Ticket 003 ships with a built-in default (`enabled: true`, its severity/confidence from Ticket 003, and a default threshold where applicable). `npx @diego22rct/tenets .` works with no config file at all — the config file exists only to override.

**Schema**:
```ts
interface TenetsConfig {
  rules?: Record<string, boolean | RuleSettings>;
  ignore?: string[]; // additional glob excludes, on top of respecting .gitignore by default
  overrides?: Array<{ files: string | string[]; rules: Record<string, boolean | RuleSettings> }>;
}
interface RuleSettings {
  enabled?: boolean;
  severity?: 'info' | 'warning' | 'error';
  threshold?: number;        // rule-specific meaning, see defaults table
  options?: Record<string, unknown>; // rule-specific extras (e.g. exclusion lists)
}
```
`rules['ruleId'] = false` is shorthand for `{ enabled: false }`. Monorepo package discovery is **not** part of this config — it reuses Ticket 001's automatic `tsconfig.json` discovery; this schema only carries rule settings and per-glob `overrides`, not workspace roots.

**Default thresholds/options per rule**:

| ruleId | default threshold | default options |
|---|---|---|
| `srp/function-length` | 50 (LOC) | — |
| `srp/class-method-count` | 10 (methods) | — |
| `dip/direct-instantiation` | — | `excludeConstructors: ['Date','Map','Set','WeakMap','WeakSet','Array','Error','RegExp','Promise']` |
| `dry/exact-duplicate` | 4 (min statements to consider) | — |
| `kiss/cyclomatic-complexity` | 10 | — |
| `kiss/nesting-depth` | 4 | — |
| `yagni/unused-export` | — | `exemptEntryPoints: true` (per Ticket 003's package.json `main`/`exports` exemption) |
| `yagni/single-impl-interface` | — | — |

**Ignore handling**: `.gitignore` is respected by default (no need to re-list `node_modules`, build output, etc.); `ignore` in config adds further glob excludes on top.

**Monorepo overrides**: a single `overrides` array in the root config, ESLint-style (`{ files: glob, rules: {...} }`), merged over the top-level `rules` for matching files. No nested per-package config files — one file, one source of truth, consistent with the single-command CLI simplicity (Ticket 005).
