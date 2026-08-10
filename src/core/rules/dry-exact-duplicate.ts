import type { Finding, FunctionFact } from '../types.js';

const MIN_STATEMENTS = 4;

export function dryExactDuplicate(facts: FunctionFact[]): Finding[] {
  const bySignature = new Map<string, FunctionFact[]>();

  for (const fact of facts) {
    if (fact.statementCount < MIN_STATEMENTS) continue;
    const group = bySignature.get(fact.normalizedBodySignature) ?? [];
    group.push(fact);
    bySignature.set(fact.normalizedBodySignature, group);
  }

  const findings: Finding[] = [];
  for (const group of bySignature.values()) {
    if (group.length < 2) continue;
    for (const fact of group) {
      const others = group.filter((other) => other !== fact).map((other) => other.name);
      findings.push({
        ruleId: 'dry/exact-duplicate',
        principle: 'DRY',
        severity: 'warning',
        confidence: 'high',
        message: `Function '${fact.name}' duplicates the body of: ${others.join(', ')}`,
        location: fact.location,
      });
    }
  }

  return findings;
}
