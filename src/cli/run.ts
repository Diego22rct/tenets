import fs from 'node:fs';
import path from 'node:path';
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
       tenets install [path]

Static analysis for SOLID/DRY/KISS/YAGNI violations in TypeScript codebases.
'path' defaults to the current directory.

Options:
  --format <terminal|json>       Output format (default: terminal)
  --fail-on <info|warning|error> Minimum severity that causes a non-zero exit code (default: warning)
  --help, -h                     Show this help text

Commands:
  install [path]  Add AI-agent guidance (AGENTS.md, CLAUDE.md) to a project

Example:
  tenets ./src --format json --fail-on error
`;

const AGENT_RULE = `After finishing a coding task, or before committing, run \`npx @diego22rct/tenets [path]\` and alert the user to any findings. Findings are tiered by severity (\`info\` < \`warning\` < \`error\`); an exit code of \`1\` means violations met the \`--fail-on\` threshold (default: \`warning\`) and should be surfaced prominently, not silently ignored.
`;

export async function runCli(argv: string[]): Promise<CliResult> {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { exitCode: 0, stdout: HELP_TEXT };
  }

  if (argv[0] === 'install') {
    return runInstall(argv[1] ?? '.');
  }

  const options = parseArgs(argv);

  let result: AnalysisResult;
  try {
    result = await analyze({ path: options.path });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 2, stdout: `tenets: failed to analyze '${options.path}': ${message}\n` };
  }

  const stdout = options.format === 'json' ? formatJson(result) : formatTerminal(result);
  const failing = result.findings.some((f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[options.failOn]);

  return { exitCode: failing ? 1 : 0, stdout };
}

function runInstall(targetPath: string): CliResult {
  const resolvedPath = path.resolve(targetPath);
  for (const filename of ['AGENTS.md', 'CLAUDE.md']) {
    writeAgentRule(path.join(resolvedPath, filename));
  }
  return { exitCode: 0, stdout: 'tenets: installed agent guidance in AGENTS.md, CLAUDE.md\n' };
}

function writeAgentRule(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, AGENT_RULE);
    return;
  }
  const existing = fs.readFileSync(filePath, 'utf8');
  if (existing.includes(AGENT_RULE)) return;
  fs.appendFileSync(filePath, `\n${AGENT_RULE}`);
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

function formatTerminal({ findings, skippedFiles, score }: AnalysisResult): string {
  const body =
    findings.length === 0
      ? 'tenets: no violations found\n'
      : `${formatFindingsByFile(findings)}\ntenets: ${findings.length} finding(s), ${score} findings/KLOC\n`;

  if (skippedFiles.length === 0) {
    return body;
  }
  return `${body}tenets: ${skippedFiles.length} file(s) could not be analyzed: ${skippedFiles.join(', ')}\n`;
}

function formatFindingsByFile(findings: Finding[]): string {
  const files = groupFindingsByFile(findings);
  return Object.entries(files)
    .map(
      ([file, fileFindings]) =>
        `${file}:\n${fileFindings
          .map((f) => `  [${f.severity}] ${f.ruleId} :${f.location.startLine}\n    ${f.message}`)
          .join('\n')}`,
    )
    .join('\n\n');
}

function groupFindingsByFile(findings: Finding[]): Record<string, Finding[]> {
  const files: Record<string, Finding[]> = {};
  for (const finding of findings) {
    (files[finding.location.file] ??= []).push(finding);
  }
  return files;
}

function formatJson({ findings, skippedFiles, score }: AnalysisResult): string {
  return JSON.stringify({
    summary: { totalFindings: findings.length, score },
    files: groupFindingsByFile(findings),
    skippedFiles,
  });
}
