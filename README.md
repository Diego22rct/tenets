# @diego22rct/tenets

Static analysis CLI that flags SOLID/DRY/KISS/YAGNI violations in TypeScript codebases. Built against a HonoJS + Next.js stack, but works on any `.ts`/`.tsx` project — it has no framework-specific rules yet, so unrecognized code is still analyzed with the generic rule set rather than skipped.

## Usage

```
npx @diego22rct/tenets [path] [options]
```

`path` defaults to the current directory.

### Options

| Flag | Values | Default | Meaning |
|---|---|---|---|
| `--format` | `terminal` \| `json` | `terminal` | Output format |
| `--fail-on` | `info` \| `warning` \| `error` | `warning` | Minimum severity that causes a non-zero exit code |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Ran clean — no findings at or above the `--fail-on` threshold |
| `1` | Findings at or above the `--fail-on` threshold |
| `2` | Tool error — bad path, crash |

### Example

```
$ npx @diego22rct/tenets ./src

[warning] srp/function-length src/billing/calculate-totals.ts:85
  Function 'calculateTotals' is 79 lines long, exceeding the 50-line threshold

[warning] yagni/unused-export src/billing/calculate-totals.ts:59
  Export 'groupTaxTotals' is not imported anywhere in the analyzed set

tenets: 2 finding(s)
```

## Rules

Every finding carries a fixed `severity` (`info` | `warning` | `error` — `error` isn't used by any v1 rule) and `confidence` (`high` | `medium` | `low`), reflecting how heuristic the underlying signal is.

| Rule | Principle | Signal | Default threshold | Severity | Confidence |
|---|---|---|---|---|---|
| `srp/function-length` | SOLID | Function body exceeds N lines | 50 | warning | medium |
| `srp/class-method-count` | SOLID | Class has more than N methods | 10 | warning | medium |
| `dip/direct-instantiation` | SOLID | `new X()` inside a class method, X not a built-in (`Date`, `Map`, `Set`, `Array`, `Error`, `RegExp`, `Promise`, ...) | — | info | medium |
| `dry/exact-duplicate` | DRY | ≥2 functions share a structurally identical body (≥4 statements) | 4 statements | warning | high |
| `kiss/cyclomatic-complexity` | KISS | Function's cyclomatic complexity exceeds N | 10 | warning | high |
| `kiss/nesting-depth` | KISS | Function nests control flow deeper than N levels | 4 | warning | high |
| `yagni/unused-export` | YAGNI | Exported function/class with no matching import anywhere in the analyzed set | — | warning | medium |
| `yagni/single-impl-interface` | YAGNI | Interface implemented by exactly one class | — | info | low |

No config file yet — thresholds above are fixed. Ignoring paths and per-rule overrides are planned but not implemented.

## Programmatic usage

```ts
import { analyze } from '@diego22rct/tenets';

const result = await analyze({ path: './src' });
// result.findings: Finding[]
// result.skippedFiles: string[] — files that failed to resolve during parsing
```

## Known limitations

- **No config file support yet.** Thresholds and severities are fixed defaults.
- **No framework-aware rules yet.** Files that a framework invokes by convention rather than by explicit import — e.g. Next.js's `middleware.ts` — will show up as `yagni/unused-export` even though they're real, used code.
- **Concurrent invocations on the same machine can stall.** The parsing engine spawns a native TypeScript compiler process per run; running multiple `tenets` invocations at once has been observed to cause severe IPC contention between them. A single invocation (the normal `npx` usage pattern) is unaffected.
- **Built on TypeScript 7's `unstable/ast` API.** Microsoft has stated TypeScript 7.0's programmatic API is not yet stable and 7.1 will ship a different one — a future TypeScript upgrade may require adapter changes.

## License

MIT
