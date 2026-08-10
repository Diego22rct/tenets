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
  location: Location;
}

export interface ClassFact {
  id: string;
  file: string;
  name: string;
  methodIds: string[];
  implementsInterfaces: string[];
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
  location: Location;
}

export interface ImportFact {
  id: string;
  file: string;
  source: string;
  importedNames: string[];
  isTypeOnly: boolean;
  location: Location;
}

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

export interface AnalysisResult {
  findings: Finding[];
}
