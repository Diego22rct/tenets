import type { ExportFact, Finding, ImportFact } from '../types.js';

export function yagniUnusedExport(exportFacts: ExportFact[], importFacts: ImportFact[]): Finding[] {
  const importedNames = new Set(importFacts.flatMap((fact) => fact.importedNames));

  return exportFacts
    .filter(
      (fact) =>
        fact.kind !== 'default' &&
        fact.frameworkRole?.role !== 'entry-point' &&
        !importedNames.has(fact.name),
    )
    .map((fact) => ({
      ruleId: 'yagni/unused-export',
      principle: 'YAGNI',
      severity: 'warning',
      confidence: 'medium',
      message: `Export '${fact.name}' is not imported anywhere in the analyzed set`,
      location: fact.location,
    }));
}
