import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import {
  isArrowFunction,
  isBinaryExpression,
  isBlock,
  isCallExpression,
  isClassDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isMethodDeclaration,
  isNamedImports,
  isNewExpression,
  isNumericLiteral,
  isPropertyAccessExpression,
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
import type { CallFact, ClassFact, ExportFact, FrameworkRole, FunctionFact, ImportFact, Location } from '../types.js';

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
    return;
  }
  if (isCallExpression(node)) {
    collectCallExpression(node, sourceFile, file, facts);
  }
}

function collectCallExpression(node: any, sourceFile: SourceFile, file: string, facts: ParsedFacts): void {
  if (node.expression.kind === SyntaxKind.ImportKeyword && node.arguments?.length > 0) {
    const firstArg = node.arguments[0];
    if (isStringLiteral(firstArg)) {
      const location = toLocation(node, sourceFile, file);
      const importedNames: string[] = [];

      if (node.parent && isPropertyAccessExpression(node.parent) && node.parent.name.text === 'then') {
        const thenCall = node.parent.parent;
        if (thenCall && isCallExpression(thenCall) && thenCall.arguments?.length > 0) {
          const callback = thenCall.arguments[0];
          if ((isArrowFunction(callback) || isFunctionExpression(callback)) && callback.body) {
            extractAccessedPropertyNames(callback.body, importedNames);
          }
        }
      }

      facts.importFacts.push({
        id: `${file}:${location.startLine}:${location.startColumn}`,
        file,
        source: firstArg.text,
        importedNames,
        isTypeOnly: false,
        location,
      });
    }
  }
}

function extractAccessedPropertyNames(node: Node, names: string[]): void {
  const visit = (current: Node): void => {
    if (isPropertyAccessExpression(current) && current.name) {
      names.push(current.name.text);
    }
    current.forEachChild(visit);
  };
  node.forEachChild(visit);
}

function collectFunctionDeclaration(
  node: FunctionDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const role = detectFrameworkRole(node, sourceFile, file);
  facts.functionFacts.push(toFunctionFact(node, sourceFile, file, undefined, role));
  if (hasExportModifier(node)) {
    facts.exportFacts.push(toExportFact(node, sourceFile, file, 'function', role));
  }
}

function collectClassDeclaration(
  node: ClassDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const role = detectFrameworkRole(node, sourceFile, file);
  const methodIds = collectClassMethods(node, sourceFile, file, facts);
  facts.classFacts.push(toClassFact(node, sourceFile, file, methodIds, extractImplementsInterfaces(node, sourceFile), role));
  if (hasExportModifier(node)) {
    facts.exportFacts.push(toExportFact(node, sourceFile, file, 'class', role));
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
    const role = detectFrameworkRole(member, sourceFile, file);
    const methodFact = toFunctionFact(member, sourceFile, file, undefined, role);
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
  const role = detectFrameworkRole(node, sourceFile, file);
  facts.functionFacts.push(toFunctionFact(node.initializer, sourceFile, file, node.name.text, role));
}

function hasExportModifier(node: FunctionDeclaration | ClassDeclaration): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false;
}

function hasDefaultModifier(node: FunctionDeclaration | ClassDeclaration): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.DefaultKeyword) ?? false;
}

function getDecorators(node: Node): Node[] {
  const decorators: Node[] = [];
  const modifiers = (node as any).modifiers;
  if (modifiers) {
    for (const m of modifiers) {
      if (m.kind === SyntaxKind.Decorator) {
        decorators.push(m);
      }
    }
  }
  return decorators;
}

function getDecoratorName(decoratorNode: Node, sourceFile: SourceFile): string | undefined {
  const expr = (decoratorNode as any).expression;
  if (!expr) return undefined;
  if (isIdentifier(expr)) {
    return expr.text;
  }
  if (isCallExpression(expr) && expr.expression && isIdentifier(expr.expression)) {
    return expr.expression.text;
  }
  return undefined;
}

function detectFrameworkRole(node: Node, sourceFile: SourceFile, file: string): FrameworkRole | undefined {
  const normFile = file.replaceAll('\\', '/');
  const fileName = path.basename(normFile).toLowerCase();

  const decorators = getDecorators(node);
  const isNestImport = sourceFile.text.includes('@nestjs/');
  const isAngularImport = sourceFile.text.includes('@angular/');

  for (const dec of decorators) {
    const decName = getDecoratorName(dec, sourceFile);
    if (!decName) continue;

    if (decName === 'Component') {
      return { framework: 'angular', role: 'component', confidence: 'high' };
    }
    if (decName === 'Directive') {
      return { framework: 'angular', role: 'directive', confidence: 'high' };
    }
    if (decName === 'Pipe') {
      return { framework: 'angular', role: 'pipe', confidence: 'high' };
    }
    if (decName === 'NgModule') {
      return { framework: 'angular', role: 'module', confidence: 'high' };
    }
    if (decName === 'Controller') {
      return { framework: 'nestjs', role: 'controller', confidence: 'high' };
    }
    if (decName === 'Module') {
      return { framework: 'nestjs', role: 'module', confidence: 'high' };
    }
    if (decName === 'Resolver') {
      return { framework: 'nestjs', role: 'resolver', confidence: 'high' };
    }
    if (decName === 'WebSocketGateway' || decName === 'Gateway') {
      return { framework: 'nestjs', role: 'gateway', confidence: 'high' };
    }
    if (decName === 'Catch') {
      return { framework: 'nestjs', role: 'filter', confidence: 'high' };
    }
    if (decName === 'Injectable') {
      const framework = isNestImport ? 'nestjs' : isAngularImport ? 'angular' : 'nestjs';
      return { framework, role: 'service', confidence: 'high' };
    }

    if (['Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head', 'All'].includes(decName)) {
      return { framework: 'nestjs', role: 'route-handler', confidence: 'high' };
    }
    if (decName === 'SubscribeMessage') {
      return { framework: 'nestjs', role: 'gateway', confidence: 'high' };
    }
    if (['Query', 'Mutation', 'Subscription'].includes(decName)) {
      return { framework: 'nestjs', role: 'resolver', confidence: 'high' };
    }
  }

  // Entry point check
  if (
    fileName === 'main.ts' ||
    fileName === 'main.server.ts' ||
    fileName === 'app.config.ts' ||
    fileName === 'app.routes.ts' ||
    fileName === 'server.ts' ||
    sourceFile.text.includes('bootstrapApplication(') ||
    sourceFile.text.includes('NestFactory.create(')
  ) {
    const framework = isNestImport ? 'nestjs' : isAngularImport ? 'angular' : 'angular';
    return { framework, role: 'entry-point', confidence: 'high' };
  }

  // File path naming fallback
  if (normFile.endsWith('.component.ts') || normFile.endsWith('.component.tsx')) {
    return { framework: 'angular', role: 'component', confidence: 'medium' };
  }
  if (normFile.endsWith('.directive.ts')) {
    return { framework: 'angular', role: 'directive', confidence: 'medium' };
  }
  if (normFile.endsWith('.pipe.ts')) {
    return { framework: 'angular', role: 'pipe', confidence: 'medium' };
  }
  if (normFile.endsWith('.controller.ts')) {
    return { framework: 'nestjs', role: 'controller', confidence: 'medium' };
  }
  if (normFile.endsWith('.resolver.ts')) {
    return { framework: 'nestjs', role: 'resolver', confidence: 'medium' };
  }
  if (normFile.endsWith('.gateway.ts')) {
    return { framework: 'nestjs', role: 'gateway', confidence: 'medium' };
  }
  if (normFile.endsWith('.guard.ts')) {
    return { framework: isNestImport ? 'nestjs' : 'angular', role: 'guard', confidence: 'medium' };
  }
  if (normFile.endsWith('.interceptor.ts')) {
    return { framework: isNestImport ? 'nestjs' : 'angular', role: 'interceptor', confidence: 'medium' };
  }
  if (normFile.endsWith('.filter.ts')) {
    return { framework: 'nestjs', role: 'filter', confidence: 'medium' };
  }
  if (normFile.endsWith('.service.ts')) {
    return { framework: isNestImport ? 'nestjs' : 'angular', role: 'service', confidence: 'medium' };
  }
  if (normFile.endsWith('.module.ts')) {
    return { framework: isNestImport ? 'nestjs' : 'angular', role: 'module', confidence: 'medium' };
  }

  // Next.js & Hono checks
  if (normFile.includes('/app/') && (fileName === 'page.tsx' || fileName === 'layout.tsx')) {
    return { framework: 'nextjs', role: 'component', confidence: 'high' };
  }
  if (normFile.includes('/app/') && (fileName === 'route.ts' || fileName === 'route.tsx')) {
    return { framework: 'nextjs', role: 'route-handler', confidence: 'high' };
  }
  if (normFile.includes('/pages/api/')) {
    return { framework: 'nextjs', role: 'route-handler', confidence: 'high' };
  }

  return undefined;
}

function toExportFact(
  node: FunctionDeclaration | ClassDeclaration,
  sourceFile: SourceFile,
  file: string,
  kind: ExportFact['kind'],
  frameworkRole?: FrameworkRole,
): ExportFact {
  const location = toLocation(node, sourceFile, file);

  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    name: node.name?.text ?? '<anonymous>',
    kind: hasDefaultModifier(node) ? 'default' : kind,
    frameworkRole,
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
  frameworkRole?: FrameworkRole,
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
    frameworkRole,
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
  frameworkRole?: FrameworkRole,
): ClassFact {
  const location = toLocation(node, sourceFile, file);

  return {
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    name: node.name?.text ?? '<anonymous>',
    methodIds,
    implementsInterfaces,
    frameworkRole,
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
