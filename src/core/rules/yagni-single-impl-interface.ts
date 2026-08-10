import type { ClassFact, Finding } from '../types.js';

export function yagniSingleImplInterface(facts: ClassFact[]): Finding[] {
  const implementers = new Map<string, ClassFact[]>();

  for (const fact of facts) {
    for (const interfaceName of fact.implementsInterfaces) {
      const group = implementers.get(interfaceName) ?? [];
      group.push(fact);
      implementers.set(interfaceName, group);
    }
  }

  const findings: Finding[] = [];
  for (const [interfaceName, group] of implementers) {
    if (group.length !== 1) continue;
    const [fact] = group;
    findings.push({
      ruleId: 'yagni/single-impl-interface',
      principle: 'YAGNI',
      severity: 'info',
      confidence: 'low',
      message: `Interface '${interfaceName}' has only one implementation: '${fact!.name}'`,
      location: fact!.location,
    });
  }

  return findings;
}
