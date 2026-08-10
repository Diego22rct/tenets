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
});
