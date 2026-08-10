import type { ClassFact, Finding } from '../types.js';

const DEFAULT_THRESHOLD = 10;

export function srpClassMethodCount(facts: ClassFact[]): Finding[] {
  return facts
    .filter((fact) => fact.methodIds.length > DEFAULT_THRESHOLD)
    .map((fact) => ({
      ruleId: 'srp/class-method-count',
      principle: 'SRP',
      severity: 'warning',
      confidence: 'medium',
      message: `Class '${fact.name}' has ${fact.methodIds.length} methods, exceeding the ${DEFAULT_THRESHOLD}-method threshold`,
      location: fact.location,
    }));
}
