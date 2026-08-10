import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import {
  isArrowFunction,
  isBinaryExpression,
  isBlock,
  isClassDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isMethodDeclaration,
  isNamedImports,
  isNewExpression,
  isNumericLiteral,
  isStringLiteral,
  isVariableDeclaration,
  SyntaxKind,
} from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import type {
  ArrowFunction,
  Block,
  ClassDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  MethodDeclaration,
  Node,
  SourceFile,
  VariableDeclaration,
} from 'typescript/unstable/ast';
import type { CallFact, ClassFact, ExportFact, FunctionFact, ImportFact, Location } from '../types.js';

export interface ParsedFacts {
  functionFacts: FunctionFact[];
  classFacts: ClassFact[];
  callFacts: CallFact[];
  exportFacts: ExportFact[];
  importFacts: ImportFact[];
  skippedFiles: string[];
}

export function parseFacts(rootPath: string): ParsedFacts {
  const absoluteRootPath = path.resolve(rootPath);
  return parseFiles(findSourceFiles(absoluteRootPath), absoluteRootPath);
}

export function parseFiles(files: string[], rootPath: string): ParsedFacts {
  const facts: ParsedFacts = {
    functionFacts: [],
    classFacts: [],
    callFacts: [],
    exportFacts: [],
    importFacts: [],
    skippedFiles: [],
  };

  const api = new API({ cwd: rootPath });
  try {
    const snapshot = api.updateSnapshot({ openFiles: files });
    for (const file of files) {
      const project = snapshot.getDefaultProjectForFile(file);
      const sourceFile = project?.program.getSourceFile(file);
      if (!sourceFile) {
        facts.skippedFiles.push(file);
        continue;
      }
      collectFileFacts(sourceFile, file, facts);
    }
  } finally {
    api.close();
  }

  return facts;
}

function collectFileFacts(sourceFile: SourceFile, file: string, facts: ParsedFacts): void {
  const visit = (node: Node): void => {
    collectNodeFacts(node, sourceFile, file, facts);
    node.forEachChild(visit);
  };
  sourceFile.forEachChild(visit);
}

function collectNodeFacts(node: Node, sourceFile: SourceFile, file: string, facts: ParsedFacts): void {
  if (isFunctionDeclaration(node) && node.body) {
    collectFunctionDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (isClassDeclaration(node)) {
    collectClassDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (isImportDeclaration(node)) {
    collectImportDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (isVariableDeclaration(node)) {
    collectVariableDeclaration(node, sourceFile, file, facts);
  }
}

function collectFunctionDeclaration(
  node: FunctionDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  facts.functionFacts.push(toFunctionFact(node, sourceFile, file));
  if (hasExportModifier(node)) {
    facts.exportFacts.push(toExportFact(node, sourceFile, file, 'function'));
  }
}

function collectClassDeclaration(
  node: ClassDeclaration,
  sourceFile: SourceFile,
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
  node: ClassDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): string[] {
  const methodIds: string[] = [];
  for (const member of node.members) {
    if (!isMethodDeclaration(member) || !member.body) continue;
    const methodFact = toFunctionFact(member, sourceFile, file);
    facts.functionFacts.push(methodFact);
    methodIds.push(methodFact.id);
    facts.callFacts.push(...collectNewExpressionCalls(member.body, sourceFile, file));
  }
  return methodIds;
}

function collectImportDeclaration(
  node: ImportDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const importFact = toImportFact(node, sourceFile, file);
  if (importFact) facts.importFacts.push(importFact);
}

function collectVariableDeclaration(
  node: VariableDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  if (!isIdentifier(node.name) || !node.initializer || !isBlockBodiedFunctionExpression(node.initializer)) {
    return;
  }
  facts.functionFacts.push(toFunctionFact(node.initializer, sourceFile, file, node.name.text));
}

function hasExportModifier(node: FunctionDeclaration | ClassDeclaration): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false;
}

function toExportFact(
  node: FunctionDeclaration | ClassDeclaration,
  sourceFile: SourceFile,
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

function toImportFact(node: ImportDeclaration, sourceFile: SourceFile, file: string): ImportFact | undefined {
  if (!isStringLiteral(node.moduleSpecifier)) return undefined;

  const importedNames: string[] = [];
  const importClause = node.importClause;
  if (importClause?.name) {
    importedNames.push(importClause.name.text);
  }
  if (importClause?.namedBindings && isNamedImports(importClause.namedBindings)) {
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
    isTypeOnly: importClause?.phaseModifier === SyntaxKind.TypeKeyword,
    location,
  };
}

function collectNewExpressionCalls(node: Node, sourceFile: SourceFile, file: string): CallFact[] {
  const calls: CallFact[] = [];

  const visit = (current: Node): void => {
    if (isNewExpression(current)) {
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
    current.forEachChild(visit);
  };

  node.forEachChild(visit);
  return calls;
}

type BlockBodiedFunctionLike = FunctionDeclaration | MethodDeclaration | ArrowFunction | FunctionExpression;

function isBlockBodiedFunctionExpression(node: Node): node is ArrowFunction | FunctionExpression {
  return (isArrowFunction(node) || isFunctionExpression(node)) && !!node.body && isBlock(node.body);
}

function toFunctionFact(
  node: BlockBodiedFunctionLike,
  sourceFile: SourceFile,
  file: string,
  nameOverride?: string,
): FunctionFact {
  const location = toLocation(node, sourceFile, file);
  const name = nameOverride ?? resolveDeclaredName(node, sourceFile);
  const body = node.body as Block;

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

function resolveDeclaredName(node: BlockBodiedFunctionLike, sourceFile: SourceFile): string {
  if (isFunctionDeclaration(node) || isMethodDeclaration(node)) {
    return node.name ? node.name.getText(sourceFile) : '<anonymous>';
  }
  return '<anonymous>';
}

function toClassFact(
  node: ClassDeclaration,
  sourceFile: SourceFile,
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

function extractImplementsInterfaces(node: ClassDeclaration, sourceFile: SourceFile): string[] {
  const names: string[] = [];
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token !== SyntaxKind.ImplementsKeyword) continue;
    for (const type of clause.types) {
      names.push(type.expression.getText(sourceFile));
    }
  }
  return names;
}

function toLocation(node: Node, sourceFile: SourceFile, file: string): Location {
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

const NESTING_NODE_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.CatchClause,
]);

function computeNestingDepth(node: Node): number {
  let maxDepth = 0;

  const visit = (current: Node, depth: number): void => {
    const nextDepth = NESTING_NODE_KINDS.has(current.kind) ? depth + 1 : depth;
    maxDepth = Math.max(maxDepth, nextDepth);
    current.forEachChild((child) => visit(child, nextDepth));
  };

  node.forEachChild((child) => visit(child, 0));
  return maxDepth;
}

const COMPLEXITY_NODE_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.CaseClause,
  SyntaxKind.CatchClause,
  SyntaxKind.ConditionalExpression,
]);

function computeCyclomaticComplexity(node: Node): number {
  let complexity = 1;

  const visit = (current: Node): void => {
    if (COMPLEXITY_NODE_KINDS.has(current.kind)) {
      complexity += 1;
    } else if (
      isBinaryExpression(current) &&
      (current.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken ||
        current.operatorToken.kind === SyntaxKind.BarBarToken)
    ) {
      complexity += 1;
    }
    current.forEachChild(visit);
  };

  node.forEachChild(visit);
  return complexity;
}

function computeNormalizedBodySignature(node: Node): string {
  const parts: string[] = [];

  const visit = (current: Node): void => {
    if (isIdentifier(current)) {
      parts.push('ID');
      return;
    }
    if (
      isStringLiteral(current) ||
      isNumericLiteral(current) ||
      current.kind === SyntaxKind.TrueKeyword ||
      current.kind === SyntaxKind.FalseKeyword
    ) {
      parts.push('LIT');
      return;
    }
    parts.push(SyntaxKind[current.kind]);
    current.forEachChild(visit);
  };

  node.forEachChild(visit);
  return parts.join('|');
}

function isSourceFileName(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.tsx');
}

const EXCLUDED_DIRECTORY_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  'coverage',
  '.vercel',
  '.cache',
]);

export function findSourceFiles(rootPath: string): string[] {
  const resolvedRootPath = path.resolve(rootPath);
  const stat = fs.statSync(resolvedRootPath);
  if (stat.isFile()) {
    return isSourceFileName(resolvedRootPath) ? [resolvedRootPath] : [];
  }

  const candidates = walkDirectory(resolvedRootPath);
  const gitignoreFilter = loadGitignoreFilter(resolvedRootPath);
  if (!gitignoreFilter) return candidates;

  return candidates.filter((file) => {
    const relativePath = path.relative(resolvedRootPath, file).replaceAll('\\', '/');
    return !gitignoreFilter.ignores(relativePath);
  });
}

function walkDirectory(dirPath: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDirectory(entryPath));
    } else if (entry.isFile() && isSourceFileName(entry.name)) {
      results.push(entryPath);
    }
  }
  return results;
}

function loadGitignoreFilter(rootPath: string): Ignore | undefined {
  const gitignorePath = path.join(rootPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return undefined;
  const content = fs.readFileSync(gitignorePath, 'utf8');
  return ignore().add(content);
}
