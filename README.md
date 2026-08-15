# @diego22rct/tenets

Static analysis CLI that flags SOLID/DRY/KISS/YAGNI violations in TypeScript codebases. Built with native support for HonoJS, Next.js, Angular, and NestJS conventions — automatically detecting the framework and applying specialized best practices, while generic code is analyzed with the standard rule set.

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
| `--help`, `-h` | — | — | Print usage and exit — takes priority over every other flag/path |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Ran clean — no findings at or above the `--fail-on` threshold |
| `1` | Findings at or above the `--fail-on` threshold |
| `2` | Tool error — bad path, crash. Stdout includes the underlying error message. |

### Example

```
$ npx @diego22rct/tenets ./src

src/billing/calculate-totals.ts:
  [warning] srp/function-length :85
    Function 'calculateTotals' is 79 lines long, exceeding the 50-line threshold
  [warning] yagni/unused-export :59
    Export 'groupTaxTotals' is not imported anywhere in the analyzed set

tenets: 2 finding(s), 4.1 findings/KLOC ██░░░░░░░░
tenets: framework: Hono (specialized rules applied)
```

Findings are grouped by file, followed by a summary line with the total count, a severity-weighted **score** (findings per 1000 analyzed lines of code: `info`=1, `warning`=3, `error`=5), a visual score gauge, and the detected framework specialization.

`--format json` outputs the same data as compact JSON, shaped as `{ summary: { totalFindings, score, framework }, framework, frameworks, files: { "<path>": Finding[] }, skippedFiles: string[] }`.

## Framework Support & Auto-Detection

`tenets` automatically detects the framework used by inspecting `package.json` dependencies and AST imports:

- **Hono (`hono`)**: Recognizes `new Hono()` / `new OpenAPIHono()` apps and sub-routers, chained route handlers (`.get()`, `.post()`, etc.), `createMiddleware` / `factory.createMiddleware`, `createHandlers` / `factory.createHandlers`, `@hono/zod-openapi` `createRoute`, entry points (`export default app`, `serve({ fetch: app.fetch })`), and excludes standard `HTTPException`, router classes, and Web Standards (`Headers`, `Response`, `Request`, `FormData`, `ReadableStream`) from direct instantiation warnings.
- **Next.js (`nextjs`)**: Recognizes App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`), Pages Router APIs (`pages/api/*`), middleware, and instrumentation entry points.
- **Angular (`angular`)**: Recognizes `@Component`, `@Directive`, `@Pipe`, `@NgModule`, `@Injectable`, `bootstrapApplication`, and excludes RxJS/Form primitives from direct instantiation warnings.
- **NestJS (`nestjs`)**: Recognizes `@Controller`, `@Injectable`, `@Module`, `@Resolver`, `@Gateway`, `@Catch`, entry points (`NestFactory.create`), and excludes NestJS exceptions/utilities.
- **Unspecialized**: When no specialized framework is detected, `tenets` informs you that generic rules apply.

## Rules

Every finding carries a fixed `severity` (`info` | `warning` | `error` — `error` isn't used by any v1 rule) and `confidence` (`high` | `medium` | `low`), reflecting how heuristic the underlying signal is.

| Rule | Principle | Signal | Default threshold | Severity | Confidence |
|---|---|---|---|---|---|
| `srp/function-length` | SOLID | Function body exceeds N lines | 50 | warning | medium |
| `srp/class-method-count` | SOLID | Class has more than N methods | 10 | warning | medium |
| `dip/direct-instantiation` | SOLID | `new X()` inside a class method, X not a native/runtime global (`Date`, `Map`, `Set`, `Array`, `Error`, `RegExp`, `Promise`, `URL`, `FormData`, `Headers`, `HTTPException`, `Hono`, ...) | — | info | medium |
| `dry/exact-duplicate` | DRY | ≥2 functions share a structurally identical body (≥4 statements) | 4 statements | warning | high |
| `kiss/cyclomatic-complexity` | KISS | Function's cyclomatic complexity exceeds N | 10 | warning | medium |
| `kiss/nesting-depth` | KISS | Function nests control flow deeper than N levels | 4 | warning | high |
| `yagni/unused-export` | YAGNI | Exported function/class with no matching import anywhere in the analyzed set | — | warning | medium |
| `yagni/single-impl-interface` | YAGNI | Interface implemented by exactly one class | — | info | low |

## AI agent integration

```
npx @diego22rct/tenets install [path]
```

Adds a rule to `AGENTS.md` and `CLAUDE.md` in the target project (`path` defaults to the current directory) instructing AI coding agents — Claude Code, Codex CLI, Cursor, Windsurf, Antigravity, and tools reading `AGENTS.md` — to run `tenets` after completing tasks or before committing.

### False positive reporting for agents
If an AI agent identifies that a finding is a false positive (such as a framework idiom or valid architecture pattern), the rule instructs the model not to write harmful workarounds, and instead report/create an issue at [Diego22rct/tenets Issues](https://github.com/Diego22rct/tenets/issues) with the rule ID, framework, code snippet, and explanation.

## Programmatic usage

```ts
import { analyze, detectProjectFrameworks } from '@diego22rct/tenets';

const result = await analyze({ path: './src' });
// result.findings: Finding[]
// result.skippedFiles: string[] — files that failed to resolve during parsing
// result.score: number — severity-weighted findings per 1000 analyzed LOC
// result.framework: 'hono' | 'nextjs' | 'angular' | 'nestjs' | 'unspecialized'
// result.frameworks: Framework[]
```

## Known limitations

- **No config file support yet.** Thresholds and severities are fixed defaults.
- **Concurrent invocations on the same machine can stall.** The parsing engine spawns a native TypeScript compiler process per run; running multiple `tenets` invocations at once has been observed to cause severe IPC contention between them. A single invocation (the normal `npx` usage pattern) is unaffected.
- **Built on TypeScript 7's `unstable/ast` API.** Microsoft has stated TypeScript 7.0's programmatic API is not yet stable and 7.1 will ship a different one — a future TypeScript upgrade may require adapter changes.

## License

MIT

