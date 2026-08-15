import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import {
  isArrowFunction,
  isAwaitExpression,
  isBinaryExpression,
  isBlock,
  isCallExpression,
  isClassDeclaration,
  isExportDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isImportExpression,
  isMethodDeclaration,
  isNamedExports,
  isNamedImports,
  isNewExpression,
  isNumericLiteral,
  isObjectBindingPattern,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isReturnStatement,
  isStringLiteral,
  isVariableDeclaration,
  SyntaxKind,
} from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import type {
  ArrowFunction,
  Block,
  CallExpression,
  ClassDeclaration,
  ExportDeclaration,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  MethodDeclaration,
  Node,
  PropertyAccessExpression,
  SourceFile,
  VariableDeclaration,
} from 'typescript/unstable/ast';
import type {
  CallFact,
  ClassFact,
  DynamicImportFact,
  ExportFact,
  FrameworkRole,
  FunctionFact,
  ImportFact,
  Location,
} from '../types.js';

export interface ParsedFacts {
  functionFacts: FunctionFact[];
  classFacts: ClassFact[];
  callFacts: CallFact[];
  exportFacts: ExportFact[];
  importFacts: ImportFact[];
  dynamicImportFacts: DynamicImportFact[];
  skippedFiles: string[];
  totalLoc: number;
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
    dynamicImportFacts: [],
    skippedFiles: [],
    totalLoc: 0,
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
      facts.totalLoc += sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line;
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
  if (isExportDeclaration(node)) {
    collectExportDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (isVariableDeclaration(node)) {
    collectVariableDeclaration(node, sourceFile, file, facts);
    return;
  }
  if (isCallExpression(node)) {
    collectDynamicImportThenCall(node, sourceFile, file, facts);
    return;
  }
  if (isPropertyAccessExpression(node)) {
    collectAwaitedImportPropertyAccess(node, sourceFile, file, facts);
  }
}

function collectAwaitedImportPropertyAccess(
  node: PropertyAccessExpression,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const unwrapped = isParenthesizedExpression(node.expression) ? node.expression.expression : node.expression;
  if (!isAwaitExpression(unwrapped)) return;
  const source = getDynamicImportSource(unwrapped.expression);
  if (!source) return;

  const location = toLocation(node, sourceFile, file);
  facts.dynamicImportFacts.push({
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    source,
    accessedName: node.name.text,
    location,
  });
}

function collectDynamicImportThenCall(
  node: CallExpression,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  if (!isPropertyAccessExpression(node.expression)) return;
  if (node.expression.name.text !== 'then') return;
  const source = getDynamicImportSource(node.expression.expression);
  if (!source) return;

  const callback = node.arguments[0];
  if (!callback || !isArrowFunction(callback)) return;
  const [param] = callback.parameters;
  if (!param || !isIdentifier(param.name)) return;
  const paramName = param.name.text;

  const body = callback.body;
  const accessed = isBlock(body) ? findReturnedPropertyAccess(body, paramName) : findPropertyAccessOnParam(body, paramName);
  if (!accessed) return;

  const location = toLocation(node, sourceFile, file);
  facts.dynamicImportFacts.push({
    id: `${file}:${location.startLine}:${location.startColumn}`,
    file,
    source,
    accessedName: accessed,
    location,
  });
}

function findPropertyAccessOnParam(node: Node, paramName: string): string | undefined {
  if (isPropertyAccessExpression(node) && isIdentifier(node.expression) && node.expression.text === paramName) {
    return node.name.text;
  }
  return undefined;
}

function findReturnedPropertyAccess(block: Block, paramName: string): string | undefined {
  for (const statement of block.statements) {
    if (!isReturnStatement(statement) || !statement.expression) continue;
    const accessed = findPropertyAccessOnParam(statement.expression, paramName);
    if (accessed) return accessed;
  }
  return undefined;
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

function collectExportDeclaration(
  node: ExportDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  if (!node.moduleSpecifier || !isStringLiteral(node.moduleSpecifier)) return;
  if (!node.exportClause || !isNamedExports(node.exportClause)) return;

  const source = node.moduleSpecifier.text;
  for (const element of node.exportClause.elements) {
    const location = toLocation(element, sourceFile, file);
    facts.exportFacts.push({
      id: `${file}:${location.startLine}:${location.startColumn}`,
      file,
      name: element.name.text,
      kind: 'const',
      location,
      source,
    });
  }
}

function collectVariableDeclaration(
  node: VariableDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  const role = detectFrameworkRole(node, sourceFile, file);
  if (isIdentifier(node.name) && node.initializer && isBlockBodiedFunctionExpression(node.initializer)) {
    facts.functionFacts.push(toFunctionFact(node.initializer, sourceFile, file, node.name.text, role));
  }
  if (isIdentifier(node.name) && isVariableDeclarationExported(node)) {
    const location = toLocation(node, sourceFile, file);
    facts.exportFacts.push({
      id: `${file}:${location.startLine}:${location.startColumn}`,
      file,
      name: node.name.text,
      kind: 'const',
      frameworkRole: role,
      location,
    });
  }
  collectAwaitedImportBinding(node, sourceFile, file, facts);
}

function isVariableDeclarationExported(node: VariableDeclaration): boolean {
  const statement = node.parent?.parent;
  if (!statement) return false;
  return (statement as any).modifiers?.some((m: any) => m.kind === SyntaxKind.ExportKeyword) ?? false;
}


function collectAwaitedImportBinding(
  node: VariableDeclaration,
  sourceFile: SourceFile,
  file: string,
  facts: ParsedFacts,
): void {
  if (!isObjectBindingPattern(node.name) || !node.initializer || !isAwaitExpression(node.initializer)) return;
  const source = getDynamicImportSource(node.initializer.expression);
  if (!source) return;

  const location = toLocation(node, sourceFile, file);
  for (const element of node.name.elements) {
    if (!element.name || !isIdentifier(element.name)) continue;
    const accessedName = element.propertyName && isIdentifier(element.propertyName) ? element.propertyName.text : element.name.text;
    facts.dynamicImportFacts.push({
      id: `${file}:${location.startLine}:${location.startColumn}:${accessedName}`,
      file,
      source,
      accessedName,
      location,
    });
  }
}

function getDynamicImportSource(node: Node): string | undefined {
  if (!isCallExpression(node) || !isImportExpression(node.expression)) return undefined;
  const sourceArg = node.arguments[0];
  return sourceArg && isStringLiteral(sourceArg) ? sourceArg.text : undefined;
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

function isHonoRouterInit(node: Node, sourceFile: SourceFile): boolean {
  let curr: Node = node;
  while (true) {
    if (isParenthesizedExpression(curr)) {
      curr = curr.expression;
      continue;
    }
    if (isNewExpression(curr)) {
      const callee = isIdentifier(curr.expression) ? curr.expression.text : curr.expression.getText(sourceFile);
      if (callee === 'Hono' || callee === 'OpenAPIHono') return true;
      break;
    }
    if (isCallExpression(curr)) {
      if (isPropertyAccessExpression(curr.expression)) {
        const methodName = curr.expression.name.text;
        if (
          [
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'all',
            'on',
            'use',
            'route',
            'basePath',
            'openapi',
            'doc',
            'swaggerUI',
          ].includes(methodName)
        ) {
          curr = curr.expression.expression;
          continue;
        }
        if (methodName === 'createApp' || methodName === 'createHandlers') {
          return true;
        }
      } else if (isIdentifier(curr.expression)) {
        const fnName = curr.expression.text;
        if (fnName === 'createApp' || fnName === 'createHandlers' || fnName === 'createRoute') {
          return true;
        }
      }
      curr = curr.expression;
      continue;
    }
    break;
  }
  return false;
}

function isHonoMiddlewareInit(node: Node): boolean {
  let curr: Node = node;
  while (isParenthesizedExpression(curr)) {
    curr = curr.expression;
  }
  if (isCallExpression(curr)) {
    if (isIdentifier(curr.expression) && curr.expression.text === 'createMiddleware') {
      return true;
    }
    if (isPropertyAccessExpression(curr.expression) && curr.expression.name.text === 'createMiddleware') {
      return true;
    }
  }
  return false;
}

function detectFrameworkRole(node: Node, sourceFile: SourceFile, file: string): FrameworkRole | undefined {
  const normFile = file.replaceAll('\\', '/');
  const fileName = path.basename(normFile).toLowerCase();

  const decorators = getDecorators(node);
  const isNestImport = sourceFile.text.includes('@nestjs/');
  const isAngularImport = sourceFile.text.includes('@angular/');
  const isHonoImport =
    sourceFile.text.includes("'hono'") ||
    sourceFile.text.includes('"hono"') ||
    sourceFile.text.includes('from "hono') ||
    sourceFile.text.includes("from 'hono") ||
    sourceFile.text.includes('@hono/');

  // Hono variable / initializer checks
  if (isVariableDeclaration(node) && node.initializer) {
    if (isHonoMiddlewareInit(node.initializer)) {
      return { framework: 'hono', role: 'middleware', confidence: 'high' };
    }
    if (isHonoRouterInit(node.initializer, sourceFile)) {
      return { framework: 'hono', role: 'route-handler', confidence: 'high' };
    }
    if (isHonoImport && isIdentifier(node.name) && /^[A-Z]/.test(node.name.text) && (normFile.endsWith('.tsx') || sourceFile.text.includes('hono/jsx'))) {
      return { framework: 'hono', role: 'component', confidence: 'high' };
    }
  }

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

  // Hono entry point check
  if (isHonoImport) {
    if (
      fileName === 'index.ts' ||
      fileName === 'server.ts' ||
      fileName === 'app.ts' ||
      fileName === 'worker.ts' ||
      fileName === 'main.ts' ||
      sourceFile.text.includes('export default app') ||
      sourceFile.text.includes('export default {') ||
      sourceFile.text.includes('serve(') ||
      sourceFile.text.includes('Deno.serve(') ||
      sourceFile.text.includes('handle(')
    ) {
      return { framework: 'hono', role: 'entry-point', confidence: 'high' };
    }
    if (normFile.endsWith('.routes.ts') || normFile.endsWith('.route.ts') || normFile.includes('/routes/') || normFile.includes('/handlers/')) {
      return { framework: 'hono', role: 'route-handler', confidence: 'high' };
    }
    if (normFile.endsWith('.middleware.ts') || normFile.includes('/middleware/')) {
      return { framework: 'hono', role: 'middleware', confidence: 'high' };
    }
  }

  // Entry point check (Angular / NestJS)
  if (
    fileName === 'main.ts' ||
    fileName === 'main.server.ts' ||
    fileName === 'app.config.ts' ||
    fileName === 'app.routes.ts' ||
    sourceFile.text.includes('bootstrapApplication(') ||
    sourceFile.text.includes('NestFactory.create(')
  ) {
    if (isNestImport || sourceFile.text.includes('NestFactory.create(')) {
      return { framework: 'nestjs', role: 'entry-point', confidence: 'high' };
    }
    if (isAngularImport || sourceFile.text.includes('bootstrapApplication(')) {
      return { framework: 'angular', role: 'entry-point', confidence: 'high' };
    }
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
  if (normFile.endsWith('.module.ts')) {
    return { framework: isNestImport ? 'nestjs' : 'angular', role: 'module', confidence: 'medium' };
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
    if (isNestImport) return { framework: 'nestjs', role: 'service', confidence: 'medium' };
    if (isAngularImport) return { framework: 'angular', role: 'service', confidence: 'medium' };
    if (isHonoImport) return { framework: 'hono', role: 'service', confidence: 'medium' };
    return undefined;
  }

  // Next.js & Hono checks
  const isNextAppDir = normFile.includes('/app/') || normFile.startsWith('app/');
  if (isNextAppDir) {
    if (/^(page|layout|template|loading|error|global-error|not-found|default)\.(tsx|ts|jsx|js)$/i.test(fileName)) {
      return { framework: 'nextjs', role: 'component', confidence: 'high' };
    }
    if (/^route\.(tsx|ts|jsx|js)$/i.test(fileName)) {
      return { framework: 'nextjs', role: 'route-handler', confidence: 'high' };
    }
  }

  if (normFile.includes('/pages/api/') || normFile.startsWith('pages/api/')) {
    return { framework: 'nextjs', role: 'route-handler', confidence: 'high' };
  }
  if (normFile.includes('/pages/') || normFile.startsWith('pages/')) {
    return { framework: 'nextjs', role: 'component', confidence: 'high' };
  }

  if (/^middleware\.(tsx|ts|jsx|js)$/i.test(fileName)) {
    return { framework: 'nextjs', role: 'middleware', confidence: 'high' };
  }
  if (/^instrumentation\.(ts|js)$/i.test(fileName)) {
    return { framework: 'nextjs', role: 'entry-point', confidence: 'high' };
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
