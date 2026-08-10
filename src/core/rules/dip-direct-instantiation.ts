import type { CallFact, Finding } from '../types.js';

const EXCLUDED_CALLEES = new Set([
  'Date',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Array',
  'Error',
  'RegExp',
  'Promise',
]);

export function dipDirectInstantiation(facts: CallFact[]): Finding[] {
  return facts
    .filter((fact) => fact.isNewExpression && !EXCLUDED_CALLEES.has(fact.calleeExpression))
    .map((fact) => ({
      ruleId: 'dip/direct-instantiation',
      principle: 'SOLID',
      severity: 'info',
      confidence: 'medium',
      message: `Direct instantiation of '${fact.calleeExpression}' inside a class method bypasses dependency injection`,
      location: fact.location,
    }));
}
