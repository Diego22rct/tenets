import type { Finding } from './types.js';

const SEVERITY_WEIGHT: Record<Finding['severity'], number> = { info: 1, warning: 3, error: 5 };

export function computeScore(findings: Finding[], totalLoc: number): number {
  if (totalLoc === 0) return 0;
  const weightedSum = findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0);
  return Math.round((weightedSum / totalLoc) * 1000 * 10) / 10;
}
