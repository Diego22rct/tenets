import { parseFacts } from './adapter/typescript-adapter.js';
import { computeScore } from './score.js';
import { detectProjectFrameworks } from './detect-framework.js';
import { dipDirectInstantiation } from './rules/dip-direct-instantiation.js';
import { dryExactDuplicate } from './rules/dry-exact-duplicate.js';
import { kissCyclomaticComplexity } from './rules/kiss-cyclomatic-complexity.js';
import { kissNestingDepth } from './rules/kiss-nesting-depth.js';
import { srpClassMethodCount } from './rules/srp-class-method-count.js';
import { srpFunctionLength } from './rules/srp-function-length.js';
import { yagniSingleImplInterface } from './rules/yagni-single-impl-interface.js';
import { yagniUnusedExport } from './rules/yagni-unused-export.js';
import type { AnalysisResult, AnalyzeOptions } from './types.js';

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const facts = parseFacts(options.path);
  const { functionFacts, classFacts, callFacts, exportFacts, importFacts, dynamicImportFacts, skippedFiles, totalLoc } =
    facts;
  const findings = [
    ...srpFunctionLength(functionFacts),
    ...kissNestingDepth(functionFacts),
    ...kissCyclomaticComplexity(functionFacts),
    ...dryExactDuplicate(functionFacts),
    ...srpClassMethodCount(classFacts),
    ...dipDirectInstantiation(callFacts),
    ...yagniUnusedExport(exportFacts, importFacts, dynamicImportFacts),
    ...yagniSingleImplInterface(classFacts, importFacts, exportFacts),
  ];
  const frameworkDetection = detectProjectFrameworks(options.path, facts);
  return {
    findings,
    skippedFiles,
    score: computeScore(findings, totalLoc),
    framework: frameworkDetection.primary,
    frameworks: frameworkDetection.frameworks,
  };
}

