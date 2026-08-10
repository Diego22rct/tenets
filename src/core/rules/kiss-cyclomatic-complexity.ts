import type { Finding, FunctionFact } from '../types.js';

const DEFAULT_THRESHOLD = 10;

export function kissCyclomaticComplexity(facts: FunctionFact[]): Finding[] {
  return facts
    .filter((fact) => fact.cyclomaticComplexity > DEFAULT_THRESHOLD)
    .map((fact) => ({
      ruleId: 'kiss/cyclomatic-complexity',
      principle: 'KISS',
      severity: 'warning',
      confidence: 'high',
      message: `Function '${fact.name}' has a cyclomatic complexity of ${fact.cyclomaticComplexity}, exceeding the ${DEFAULT_THRESHOLD} threshold`,
      location: fact.location,
    }));
}
