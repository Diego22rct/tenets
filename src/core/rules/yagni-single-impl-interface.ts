import path from 'node:path';
import type { ClassFact, ExportFact, Finding, ImportFact } from '../types.js';

function isRelativeSpecifier(source: string): boolean {
  return source.startsWith('.') || source.startsWith('/');
}

function resolveReExportSource(
  interfaceName: string,
  importSource: string,
  fromFile: string,
  exportFacts: ExportFact[],
): string | undefined {
  const candidate = path.resolve(path.dirname(fromFile), importSource);
  const candidateWithoutExt = candidate.replace(/\.(js|ts)x?$/, '');
  const reExport = exportFacts.find(
    (fact) =>
      fact.name === interfaceName &&
      fact.source !== undefined &&
      fact.file.replace(/\.(js|ts)x?$/, '') === candidateWithoutExt,
  );
  return reExport?.source;
}

function isExternalInterface(
  interfaceName: string,
  file: string,
  importFacts: ImportFact[],
  exportFacts: ExportFact[],
): boolean {
  const importFact = importFacts.find((fact) => fact.file === file && fact.importedNames.includes(interfaceName));
  if (!importFact) return false;
  if (!isRelativeSpecifier(importFact.source)) return true;

  const reExportSource = resolveReExportSource(interfaceName, importFact.source, file, exportFacts);
  return reExportSource !== undefined && !isRelativeSpecifier(reExportSource);
}

export function yagniSingleImplInterface(
  facts: ClassFact[],
  importFacts: ImportFact[] = [],
  exportFacts: ExportFact[] = [],
): Finding[] {
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
    if (isExternalInterface(interfaceName, fact!.file, importFacts, exportFacts)) continue;
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
