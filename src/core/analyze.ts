import fs from 'node:fs';
import path from 'node:path';
import {
  findProjectRoot,
  findSourceFiles,
  isSourceFileName,
  parseFiles,
  type ParsedFacts,
} from './adapter/typescript-adapter.js';
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
import type { AnalysisResult, AnalyzeOptions, Finding } from './types.js';

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const resolvedPath = path.resolve(options.path);
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    if (!isSourceFileName(resolvedPath)) {
      throw new Error(`'${options.path}' is not a supported TypeScript file (.ts, .tsx)`);
    }

    const projectRoot = findProjectRoot(resolvedPath);
    const projectFiles = findSourceFiles(projectRoot);
    const filesToParse = projectFiles.some((f) => path.resolve(f) === resolvedPath)
      ? projectFiles
      : [...projectFiles, resolvedPath];

    const facts = parseFiles(filesToParse, projectRoot);
    const allFindings = runAllRules(facts);

    const isTarget = (filePath: string) => path.resolve(filePath) === resolvedPath;
    const findings = allFindings.filter((f) => isTarget(f.location.file));
    const skippedFiles = facts.skippedFiles.filter(isTarget);
    const targetLoc = facts.fileLocMap.get(resolvedPath) ?? 0;
    const frameworkDetection = detectProjectFrameworks(projectRoot, facts);

    return {
      findings,
      skippedFiles,
      score: computeScore(findings, targetLoc),
      framework: frameworkDetection.primary,
      frameworks: frameworkDetection.frameworks,
    };
  }

  const sourceFiles = findSourceFiles(resolvedPath);
  const facts = parseFiles(sourceFiles, resolvedPath);
  const findings = runAllRules(facts);
  const frameworkDetection = detectProjectFrameworks(resolvedPath, facts);

  return {
    findings,
    skippedFiles: facts.skippedFiles,
    score: computeScore(findings, facts.totalLoc),
    framework: frameworkDetection.primary,
    frameworks: frameworkDetection.frameworks,
  };
}

function runAllRules(facts: ParsedFacts): Finding[] {
  const { functionFacts, classFacts, callFacts, exportFacts, importFacts, dynamicImportFacts } = facts;
  return [
    ...srpFunctionLength(functionFacts),
    ...kissNestingDepth(functionFacts),
    ...kissCyclomaticComplexity(functionFacts),
    ...dryExactDuplicate(functionFacts),
    ...srpClassMethodCount(classFacts),
    ...dipDirectInstantiation(callFacts),
    ...yagniUnusedExport(exportFacts, importFacts, dynamicImportFacts),
    ...yagniSingleImplInterface(classFacts, importFacts, exportFacts),
  ];
}

