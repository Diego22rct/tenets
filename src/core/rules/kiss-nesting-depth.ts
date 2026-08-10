import type { Finding, FunctionFact } from '../types.js';

const DEFAULT_THRESHOLD = 4;

export function kissNestingDepth(facts: FunctionFact[]): Finding[] {
  return facts
    .filter((fact) => fact.nestingDepth > DEFAULT_THRESHOLD)
    .map((fact) => ({
      ruleId: 'kiss/nesting-depth',
      principle: 'KISS',
      severity: 'warning',
      confidence: 'high',
      message: `Function '${fact.name}' nests ${fact.nestingDepth} levels deep, exceeding the ${DEFAULT_THRESHOLD}-level threshold`,
      location: fact.location,
    }));
}
