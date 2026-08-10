import { analyze } from '../core/analyze.js';
import type { AnalysisResult, Finding } from '../core/types.js';

export interface CliResult {
  exitCode: number;
  stdout: string;
}

type Severity = Finding['severity'];
type Format = 'terminal' | 'json';

const SEVERITY_ORDER: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
const DEFAULT_FAIL_ON: Severity = 'warning';

const HELP_TEXT = `Usage: tenets [path] [options]

Static analysis for SOLID/DRY/KISS/YAGNI violations in TypeScript codebases.
'path' defaults to the current directory.

Options:
  --format <terminal|json>       Output format (default: terminal)
  --fail-on <info|warning|error> Minimum severity that causes a non-zero exit code (default: warning)
  --help, -h                     Show this help text

Example:
  tenets ./src --format json --fail-on error
`;

export async function runCli(argv: string[]): Promise<CliResult> {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { exitCode: 0, stdout: HELP_TEXT };
  }

  const options = parseArgs(argv);

  let result: AnalysisResult;
  try {
    result = await analyze({ path: options.path });
  } catch {
    return { exitCode: 2, stdout: `tenets: failed to analyze '${options.path}'\n` };
  }

  const stdout = options.format === 'json' ? formatJson(result) : formatTerminal(result);
  const failing = result.findings.some((f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[options.failOn]);

  return { exitCode: failing ? 1 : 0, stdout };
}

interface CliOptions {
  path: string;
  format: Format;
  failOn: Severity;
}

function parseArgs(argv: string[]): CliOptions {
  let targetPath = '.';
  let format: Format = 'terminal';
  let failOn: Severity = DEFAULT_FAIL_ON;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--format') {
      format = argv[++i] as Format;
    } else if (arg === '--fail-on') {
      failOn = argv[++i] as Severity;
    } else if (arg && !arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  return { path: targetPath, format, failOn };
}

function formatTerminal({ findings, skippedFiles }: AnalysisResult): string {
  const body =
    findings.length === 0
      ? 'tenets: no violations found\n'
      : `${findings
          .map((f) => `[${f.severity}] ${f.ruleId} ${f.location.file}:${f.location.startLine}\n  ${f.message}`)
          .join('\n\n')}\n\ntenets: ${findings.length} finding(s)\n`;

  if (skippedFiles.length === 0) {
    return body;
  }
  return `${body}tenets: ${skippedFiles.length} file(s) could not be analyzed: ${skippedFiles.join(', ')}\n`;
}

function formatJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
