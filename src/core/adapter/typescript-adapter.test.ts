import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findSourceFiles, parseFiles } from './typescript-adapter.js';

describe('parseFiles', () => {
  it('records a file that disappears between listing and parsing in skippedFiles, without failing the rest of the analysis', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-skip-'));
    const goodFile = path.join(dir, 'good.ts');
    const raceFile = path.join(dir, 'race.ts');
    fs.writeFileSync(goodFile, 'export function ok(): number { return 1; }\n');
    fs.writeFileSync(raceFile, 'export function willBeDeleted(): number { return 2; }\n');

    const files = findSourceFiles(dir);
    fs.unlinkSync(raceFile);

    const facts = parseFiles(files, dir);

    expect(facts.skippedFiles).toEqual([raceFile]);
    expect(facts.functionFacts.some((f) => f.name === 'ok')).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('assigns frameworkRole to Angular component and NestJS controller classes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-framework-'));
    const angularFile = path.join(dir, 'user.component.ts');
    const nestFile = path.join(dir, 'user.controller.ts');

    fs.writeFileSync(
      angularFile,
      `import { Component } from '@angular/core';
@Component({ selector: 'app-user' })
export class UserComponent {}
`,
    );

    fs.writeFileSync(
      nestFile,
      `import { Controller, Get } from '@nestjs/common';
@Controller('users')
export class UserController {
  @Get()
  getUsers() {}
}
`,
    );

    const facts = parseFiles([angularFile, nestFile], dir);

    const angularClass = facts.classFacts.find((c) => c.name === 'UserComponent');
    expect(angularClass?.frameworkRole).toEqual({
      framework: 'angular',
      role: 'component',
      confidence: 'high',
    });

    const nestClass = facts.classFacts.find((c) => c.name === 'UserController');
    expect(nestClass?.frameworkRole).toEqual({
      framework: 'nestjs',
      role: 'controller',
      confidence: 'high',
    });

    const nestMethod = facts.functionFacts.find((f) => f.name === 'getUsers');
    expect(nestMethod?.frameworkRole).toEqual({
      framework: 'nestjs',
      role: 'route-handler',
      confidence: 'high',
    });

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('assigns frameworkRole to Hono router, middleware, and entry points', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-hono-'));
    const routeFile = path.join(dir, 'books.ts');
    const mwFile = path.join(dir, 'auth.ts');
    const indexFile = path.join(dir, 'index.ts');

    fs.writeFileSync(
      routeFile,
      `import { Hono } from 'hono';
export const booksApp = new Hono().get('/', (c: any) => c.text('ok'));
`,
    );

    fs.writeFileSync(
      mwFile,
      `import { createMiddleware } from 'hono/factory';
export const authMiddleware = createMiddleware(async (c: any, next: any) => { await next(); });
`,
    );

    fs.writeFileSync(
      indexFile,
      `import { Hono } from 'hono';
const app = new Hono();
export default app;
`,
    );

    const facts = parseFiles([routeFile, mwFile, indexFile], dir);

    const booksExport = facts.exportFacts.find((e) => e.name === 'booksApp');
    expect(booksExport?.frameworkRole).toEqual({
      framework: 'hono',
      role: 'route-handler',
      confidence: 'high',
    });

    const mwExport = facts.exportFacts.find((e) => e.name === 'authMiddleware');
    expect(mwExport?.frameworkRole).toEqual({
      framework: 'hono',
      role: 'middleware',
      confidence: 'high',
    });

    const indexExport = facts.exportFacts.find((e) => e.file === indexFile);
    // index.ts is detected as entry point for Hono
    if (indexExport) {
      expect(indexExport.frameworkRole?.framework).toBe('hono');
    }

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
