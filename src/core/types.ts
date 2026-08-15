export type Framework = 'angular' | 'nestjs' | 'hono' | 'nextjs';

export interface FrameworkRole {
  framework: Framework;
  role:
    | 'component'
    | 'directive'
    | 'pipe'
    | 'service'
    | 'module'
    | 'controller'
    | 'resolver'
    | 'gateway'
    | 'guard'
    | 'interceptor'
    | 'filter'
    | 'route-handler'
    | 'middleware'
    | 'entry-point';
  confidence: 'high' | 'medium' | 'low';
}

export interface Location {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface FunctionFact {
  id: string;
  file: string;
  name: string;
  loc: number;
  nestingDepth: number;
  cyclomaticComplexity: number;
  statementCount: number;
  normalizedBodySignature: string;
  frameworkRole?: FrameworkRole;
  location: Location;
}

export interface ClassFact {
  id: string;
  file: string;
  name: string;
  methodIds: string[];
  implementsInterfaces: string[];
  frameworkRole?: FrameworkRole;
  location: Location;
}

export interface CallFact {
  id: string;
  file: string;
  calleeExpression: string;
  isNewExpression: boolean;
  argumentCount: number;
  location: Location;
}

export interface ExportFact {
  id: string;
  file: string;
  name: string;
  kind: 'function' | 'class' | 'const' | 'type' | 'default';
  frameworkRole?: FrameworkRole;
  location: Location;
  source?: string;
}

export interface ImportFact {
  id: string;
  file: string;
  source: string;
  importedNames: string[];
  isTypeOnly: boolean;
  location: Location;
}

export interface DynamicImportFact {
  id: string;
  file: string;
  source: string;
  accessedName: string;
  location: Location;
}

/**
 * Stable public contract: field names/shape are relied on by external consumers
 * (the `--format json` CLI output, and agents wired up via `tenets install`).
 * Changing this shape is a deliberate, version-bumped decision, not an incidental refactor.
 */
export interface Finding {
  ruleId: string;
  principle: 'SOLID' | 'DRY' | 'KISS' | 'YAGNI';
  severity: 'info' | 'warning' | 'error';
  confidence: 'high' | 'medium' | 'low';
  message: string;
  location: Location;
}

export interface AnalyzeOptions {
  path: string;
}

/**
 * Stable public contract: field names/shape are relied on by external consumers
 * (the `--format json` CLI output, and agents wired up via `tenets install`).
 * Changing this shape is a deliberate, version-bumped decision, not an incidental refactor.
 */
export interface AnalysisResult {
  findings: Finding[];
  skippedFiles: string[];
  score: number;
  framework?: Framework | 'unspecialized';
  frameworks?: Framework[];
}

