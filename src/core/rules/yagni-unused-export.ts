import type { DynamicImportFact, ExportFact, Finding, ImportFact } from '../types.js';

export function yagniUnusedExport(
  exportFacts: ExportFact[],
  importFacts: ImportFact[],
  dynamicImportFacts: DynamicImportFact[] = [],
): Finding[] {
  const importedNames = new Set([
    ...importFacts.flatMap((fact) => fact.importedNames),
    ...dynamicImportFacts.map((fact) => fact.accessedName),
  ]);

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
