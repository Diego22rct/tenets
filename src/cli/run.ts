import { analyze } from '../core/analyze.js';
import type { Finding } from '../core/types.js';

export interface CliResult {
  exitCode: number;
  stdout: string;
}

type Severity = Finding['severity'];
type Format = 'terminal' | 'json';

const SEVERITY_ORDER: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
const DEFAULT_FAIL_ON: Severity = 'warning';

export async function runCli(argv: string[]): Promise<CliResult> {
  const options = parseArgs(argv);

  let findings: Finding[];
  try {
    findings = (await analyze({ path: options.path })).findings;
  } catch {
    return { exitCode: 2, stdout: `tenets: failed to analyze '${options.path}'\n` };
  }

  const stdout = options.format === 'json' ? formatJson(findings) : formatTerminal(findings);
  const failing = findings.some((f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[options.failOn]);

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

function formatTerminal(findings: Finding[]): string {
  if (findings.length === 0) {
    return 'tenets: no violations found\n';
  }

  const lines = findings.map(
    (f) => `[${f.severity}] ${f.ruleId} ${f.location.file}:${f.location.startLine}\n  ${f.message}`,
  );
  return `${lines.join('\n\n')}\n\ntenets: ${findings.length} finding(s)\n`;
}

function formatJson(findings: Finding[]): string {
  return JSON.stringify({ findings }, null, 2);
}
