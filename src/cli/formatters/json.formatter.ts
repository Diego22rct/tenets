import type { AnalysisResult } from '../../core/types.js';
import { groupFindingsByFile } from './terminal.formatter.js';

export function formatJson({ findings, skippedFiles, score, framework, frameworks }: AnalysisResult): string {
  const detectedFramework = framework ?? 'unspecialized';
  const detectedFrameworks = frameworks ?? (framework && framework !== 'unspecialized' ? [framework] : []);
  return JSON.stringify({
    summary: { totalFindings: findings.length, score, framework: detectedFramework },
    framework: detectedFramework,
    frameworks: detectedFrameworks,
    files: groupFindingsByFile(findings),
    skippedFiles,
  });
}
