import type { Finding, FunctionFact } from '../types.js';

const DEFAULT_THRESHOLD = 50;

export function srpFunctionLength(facts: FunctionFact[]): Finding[] {
  return facts
    .filter((fact) => fact.loc > DEFAULT_THRESHOLD)
    .map((fact) => ({
      ruleId: 'srp/function-length',
      principle: 'SRP',
      severity: 'warning',
      confidence: 'medium',
      message: `Function '${fact.name}' is ${fact.loc} lines long, exceeding the ${DEFAULT_THRESHOLD}-line threshold`,
      location: fact.location,
    }));
}
