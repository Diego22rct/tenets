import pc from 'picocolors';
import { FRAMEWORK_NAMES } from '../../core/detect-framework.js';
import type { AnalysisResult, Finding } from '../../core/types.js';
import type { Severity } from '../types.js';

export interface TerminalFormatterOptions {
  isTTY?: boolean;
  noColor?: boolean;
}

const SCORE_GAUGE_CAP = 20;
const SCORE_GAUGE_SEGMENTS = 10;

export function formatTerminal(
  { findings, skippedFiles, score, framework, frameworks }: AnalysisResult,
  options?: TerminalFormatterOptions,
): string {
  const useColor = options?.isTTY !== undefined ? options.isTTY && !options.noColor : !!process.stdout.isTTY && !process.env.NO_COLOR;
  const colors = pc.createColors(useColor);
  const frameworkLine = formatFrameworkLine(framework, frameworks);
  const body =
    findings.length === 0
      ? `tenets: no violations found\n${frameworkLine}`
      : `${formatFindingsByFile(findings, colors)}\ntenets: ${findings.length} finding(s), ${score} findings/KLOC ${formatScoreGauge(score, colors)}\n${frameworkLine}`;

  if (skippedFiles.length === 0) {
    return body;
  }
  return `${body}tenets: ${skippedFiles.length} file(s) could not be analyzed: ${skippedFiles.join(', ')}\n`;
}

function formatScoreGauge(score: number, colors: ReturnType<typeof pc.createColors>): string {
  const filled = Math.round((Math.min(score, SCORE_GAUGE_CAP) / SCORE_GAUGE_CAP) * SCORE_GAUGE_SEGMENTS);
  const bar = '█'.repeat(filled) + '░'.repeat(SCORE_GAUGE_SEGMENTS - filled);
  const color = score < 5 ? colors.green : score < 15 ? colors.yellow : colors.red;
  return color(bar);
}

function formatFrameworkLine(
  framework: AnalysisResult['framework'],
  frameworks: AnalysisResult['frameworks'],
): string {
  if (framework && framework !== 'unspecialized') {
    const list = frameworks && frameworks.length > 0 ? frameworks : [framework];
    const names = list.map((f) => FRAMEWORK_NAMES[f] ?? f).join(', ');
    return `tenets: framework: ${names} (specialized rules applied)\n`;
  }
  return 'tenets: framework: not specialized (generic rules applied)\n';
}

function formatFindingsByFile(findings: Finding[], colors: ReturnType<typeof pc.createColors>): string {
  const colorFor: Record<Severity, (text: string) => string> = {
    info: colors.cyan,
    warning: colors.yellow,
    error: colors.red,
  };
  const files = groupFindingsByFile(findings);
  return Object.entries(files)
    .map(
      ([file, fileFindings]) =>
        `${file}:\n${fileFindings
          .map((f) => `  ${colorFor[f.severity](`[${f.severity}]`)} ${f.ruleId} :${f.location.startLine}\n    ${f.message}`)
          .join('\n')}`,
    )
    .join('\n\n');
}

export function groupFindingsByFile(findings: Finding[]): Record<string, Finding[]> {
  const files: Record<string, Finding[]> = {};
  for (const finding of findings) {
    (files[finding.location.file] ??= []).push(finding);
  }
  return files;
}
