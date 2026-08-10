import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { CallFact, ClassFact, ExportFact, FunctionFact, ImportFact, Location } from '../types.js';

export interface ParsedFacts {
  functionFacts: FunctionFact[];
  classFacts: ClassFact[];
  callFacts: CallFact[];
  exportFacts: ExportFact[];
  importFacts: ImportFact[];
}

export function parseFacts(rootPath: string): ParsedFacts {
  const facts: ParsedFacts = { functionFacts: [], classFacts: [], callFacts: [], exportFacts: [], importFacts: [] };

  for (const file of findSourceFiles(rootPath)) {
    parseFile(file, facts);
  }

  return facts;
}

function parseFile(file: string, facts: ParsedFacts): void {
  const sourceText = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);

  const visit = (node: ts.Node): void => {
    collectNodeFacts(node, sourceFile, file, facts);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

function collectNodeFacts(node: ts.Node, sourceFile: ts.SourceFile, file: string, facts: ParsedFacts): void {
  if (ts.isFunctionDeclaration(node) && node.body) {
    collectFunctionDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (ts.isClassDeclaration(node)) {
    collectClassDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (ts.isImportDeclaration(node)) {
    collectImportDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (ts.isVariableDeclaration(node)) {
    collectVariableDeclaration(node, sourceFile, file, facts);
  }
}

function collectFunctionDeclaration(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  facts.functionFacts.push(toFunctionFact(node, sourceFile, file));
  if (hasExportModifier(node)) {
    facts.exportFacts.push(toExportFact(node, sourceFile, file, 'function'));
  }
}

function collectClassDeclaration(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const methodIds = collectClassMethods(node, sourceFile, file, facts);
  facts.classFacts.push(toClassFact(node, sourceFile, file, methodIds, extractImplementsInterfaces(node, sourceFile)));
  if (hasExportModifier(node)) {
    facts.exportFacts.push(toExportFact(node, sourceFile, file, 'class'));
  }
}

function collectClassMethods(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  facts: ParsedFacts,
): string[] {
  const methodIds: string[] = [];
  for (const member of node.members) {
    if (!ts.isMethodDeclaration(member) || !member.body) continue;
    const methodFact = toFunctionFact(member, sourceFile, file);
    facts.functionFacts.push(methodFact);
    methodIds.push(methodFact.id);
    facts.callFacts.push(...collectNewExpressionCalls(member.body, sourceFile, file));
  }
  return methodIds;
}

function collectImportDeclaration(
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const importFact = toImportFact(node, sourceFile, file);
  if (importFact) facts.importFacts.push(importFact);
}

function collectVariableDeclaration(
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  if (!ts.isIdentifier(node.name) || !node.initializer || !isBlockBodiedFunctionExpression(node.initializer)) {
    return;
  }
  facts.functionFacts.push(toFunctionFact(node.initializer, sourceFile, file, node.name.text));
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function toExportFact(
  node: ts.FunctionDeclaration | ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  kind: ExportFact['kind'],
): ExportFact {
  const location = toLocation(node, sourceFile, file);

  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    name: node.name?.text ?? '<anonymous>',
    kind,
    location,
  };
}

function toImportFact(node: ts.ImportDeclaration, sourceFile: ts.SourceFile, file: string): ImportFact | undefined {
  if (!ts.isStringLiteral(node.moduleSpecifier)) return undefined;

  const importedNames: string[] = [];
  const importClause = node.importClause;
  if (importClause?.name) {
    importedNames.push(importClause.name.text);
  }
  if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    for (const element of importClause.namedBindings.elements) {
      importedNames.push(element.name.text);
    }
  }

  const location = toLocation(node, sourceFile, file);
  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    source: node.moduleSpecifier.text,
    importedNames,
    isTypeOnly: importClause?.isTypeOnly ?? false,
    location,
  };
}

function collectNewExpressionCalls(node: ts.Node, sourceFile: ts.SourceFile, file: string): CallFact[] {
  const calls: CallFact[] = [];

  const visit = (current: ts.Node): void => {
    if (ts.isNewExpression(current)) {
      const location = toLocation(current, sourceFile, file);
      calls.push({
        id: `${file}:${location.startLine}:${location.startColumn}`,
        file,
        calleeExpression: current.expression.getText(sourceFile),
        isNewExpression: true,
        argumentCount: current.arguments?.length ?? 0,
        location,
      });
    }
    ts.forEachChild(current, visit);
  };

  ts.forEachChild(node, visit);
  return calls;
}

type BlockBodiedFunctionLike =
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.ArrowFunction
  | ts.FunctionExpression;

function isBlockBodiedFunctionExpression(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
  return (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && !!node.body && ts.isBlock(node.body);
}

function toFunctionFact(
  node: BlockBodiedFunctionLike,
  sourceFile: ts.SourceFile,
  file: string,
  nameOverride?: string,
): FunctionFact {
  const location = toLocation(node, sourceFile, file);
  const name = nameOverride ?? resolveDeclaredName(node, sourceFile);
  const body = node.body as ts.Block;

  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    name,
    loc: location.endLine - location.startLine + 1,
    nestingDepth: computeNestingDepth(body),
    cyclomaticComplexity: computeCyclomaticComplexity(body),
    statementCount: body.statements.length,
    normalizedBodySignature: computeNormalizedBodySignature(body),
    location,
  };
}

function resolveDeclaredName(node: BlockBodiedFunctionLike, sourceFile: ts.SourceFile): string {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name ? node.name.getText(sourceFile) : '<anonymous>';
  }
  return '<anonymous>';
}

function toClassFact(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  file: string,
  methodIds: string[],
  implementsInterfaces: string[],
): ClassFact {
  const location = toLocation(node, sourceFile, file);

  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    name: node.name?.text ?? '<anonymous>',
    methodIds,
    implementsInterfaces,
    location,
  };
}

function extractImplementsInterfaces(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
    for (const type of clause.types) {
      names.push(type.expression.getText(sourceFile));
    }
  }
  return names;
}

function toLocation(node: ts.Node, sourceFile: ts.SourceFile, file: string): Location {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    file,
    startLine: start.line + 1,
    startColumn: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  };
}

const NESTING_NODE_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.CatchClause,
]);

function computeNestingDepth(node: ts.Node): number {
  let maxDepth = 0;

  const visit = (current: ts.Node, depth: number): void => {
    const nextDepth = NESTING_NODE_KINDS.has(current.kind) ? depth + 1 : depth;
    maxDepth = Math.max(maxDepth, nextDepth);
    ts.forEachChild(current, (child) => visit(child, nextDepth));
  };

  ts.forEachChild(node, (child) => visit(child, 0));
  return maxDepth;
}

const COMPLEXITY_NODE_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ConditionalExpression,
]);

function computeCyclomaticComplexity(node: ts.Node): number {
  let complexity = 1;

  const visit = (current: ts.Node): void => {
    if (COMPLEXITY_NODE_KINDS.has(current.kind)) {
      complexity += 1;
    } else if (
      ts.isBinaryExpression(current) &&
      (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      complexity += 1;
    }
    ts.forEachChild(current, visit);
  };

  ts.forEachChild(node, visit);
  return complexity;
}

function computeNormalizedBodySignature(node: ts.Node): string {
  const parts: string[] = [];

  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)) {
      parts.push('ID');
      return;
    }
    if (
      ts.isStringLiteral(current) ||
      ts.isNumericLiteral(current) ||
      current.kind === ts.SyntaxKind.TrueKeyword ||
      current.kind === ts.SyntaxKind.FalseKeyword
    ) {
      parts.push('LIT');
      return;
    }
    parts.push(ts.SyntaxKind[current.kind]);
    ts.forEachChild(current, visit);
  };

  ts.forEachChild(node, visit);
  return parts.join('|');
}

function findSourceFiles(rootPath: string): string[] {
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    return rootPath.endsWith('.ts') ? [rootPath] : [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__fixtures__') continue;
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSourceFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(entryPath);
    }
  }
  return results;
}
