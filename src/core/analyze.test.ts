import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyze } from './analyze.js';

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));

describe('analyze', () => {
  it('computes a severity-weighted findings-per-KLOC score', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'quality-score');

    const result = await analyze({ path: target });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe('info');
    // 1 info-severity finding (weight 1) over 7 analyzed LOC: 1 / 7 * 1000 = 142.857... -> 142.9
    expect(result.score).toBe(142.9);
  });


  it('flags a function whose body exceeds the LOC threshold as srp/function-length', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'srp-function-length');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'srp/function-length');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('SOLID');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'long-function.ts'));
  });

  it('scans .tsx files, flagging a component whose body exceeds the LOC threshold as srp/function-length', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'tsx-support');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'srp/function-length');
    expect(finding).toBeDefined();
    expect(finding?.location.file).toBe(path.join(target, 'component.tsx'));
  });

  it('exposes an empty skippedFiles array when every file parses cleanly', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'srp-function-length');

    const result = await analyze({ path: target });

    expect(result.skippedFiles).toEqual([]);
  });

  it('analyzes a relative path the same as its absolute equivalent', async () => {
    const absoluteTarget = path.join(fixturesDir, '__fixtures__', 'srp-function-length');
    const relativeTarget = path.relative(process.cwd(), absoluteTarget);

    const result = await analyze({ path: relativeTarget });

    expect(result.skippedFiles).toEqual([]);
    expect(result.findings.some((f) => f.ruleId === 'srp/function-length')).toBe(true);
  });

  it('flags an arrow function assigned to a const whose body exceeds the LOC threshold as srp/function-length', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'srp-function-length-arrow');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'srp/function-length');
    expect(finding).toBeDefined();
    expect(finding?.location.file).toBe(path.join(target, 'long-arrow-function.ts'));
  });

  it('flags a function nested past the depth threshold as kiss/nesting-depth', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'kiss-nesting-depth');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'kiss/nesting-depth');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('KISS');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('high');
    expect(finding?.location.file).toBe(path.join(target, 'deep-nesting.ts'));
  });

  it('flags a function whose cyclomatic complexity exceeds the threshold as kiss/cyclomatic-complexity', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'kiss-cyclomatic-complexity');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'kiss/cyclomatic-complexity');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('KISS');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('high');
    expect(finding?.location.file).toBe(path.join(target, 'high-complexity.ts'));
  });

  it('flags structurally identical function bodies as dry/exact-duplicate', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'dry-exact-duplicate');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'dry/exact-duplicate');
    expect(findings).toHaveLength(2);
    expect(findings[0]?.principle).toBe('DRY');
    expect(findings[0]?.severity).toBe('warning');
    expect(findings[0]?.confidence).toBe('high');
    expect(findings[0]?.location.file).toBe(path.join(target, 'duplicated-functions.ts'));
  });

  it('flags a class whose method count exceeds the threshold as srp/class-method-count', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'srp-class-method-count');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'srp/class-method-count');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('SOLID');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'big-class.ts'));
  });

  it('flags a `new` expression inside a class method as dip/direct-instantiation', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'dip-direct-instantiation');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'dip/direct-instantiation');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('SOLID');
    expect(finding?.severity).toBe('info');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'order-service.ts'));
  });

  it('does not flag instantiation of a native global (e.g. URL) as dip/direct-instantiation', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'dip-direct-instantiation-native-global');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'dip/direct-instantiation');
    expect(finding).toBeUndefined();
  });

  it('flags an export with no matching import anywhere in the analyzed set as yagni/unused-export', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-unused-export');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'yagni/unused-export');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('YAGNI');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'orphan.ts'));
  });

  it('does not flag an export consumed via a dynamic import lazy route as yagni/unused-export', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-unused-export-dynamic-import');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'yagni/unused-export');
    expect(finding).toBeUndefined();
  });

  it('does not flag an export consumed via a destructured `await import()` as yagni/unused-export', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-unused-export-dynamic-import-await');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings.some((f) => f.message.includes('AppLayoutModule'))).toBe(false);
  });

  it('does not flag an export consumed via inline `(await import()).X` property access as yagni/unused-export', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-unused-export-dynamic-import-inline');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings.some((f) => f.message.includes('AppLayoutModule'))).toBe(false);
  });

  it('does not flag an unimported `export default function` as yagni/unused-export', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-default-export');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings).toEqual([]);
  });

  it('flags an interface implemented by exactly one class as yagni/single-impl-interface', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-single-impl-interface');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'yagni/single-impl-interface');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('YAGNI');
    expect(finding?.severity).toBe('info');
    expect(finding?.confidence).toBe('low');
    expect(finding?.location.file).toBe(path.join(target, 'repository.ts'));
  });

  it('does not flag an interface implemented once but imported from an external package as yagni/single-impl-interface', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-single-impl-interface-external');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'yagni/single-impl-interface');
    expect(finding).toBeUndefined();
  });

  it('does not flag an interface re-exported from a local barrel file that originates from an external package as yagni/single-impl-interface', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'yagni-single-impl-interface-barrel');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'yagni/single-impl-interface');
    expect(finding).toBeUndefined();
  });

  it('scans nested __fixtures__ directories rather than silently excluding them', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'scans-nested-fixtures-directory');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings.map((f) => f.location.file).sort()).toEqual(
      [path.join(target, 'production.ts'), path.join(target, '__fixtures__', 'nested.ts')].sort(),
    );
  });

  it('excludes standard build/VCS directories (e.g. dist, .next) from analysis', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'skip-excluded-directories');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings.map((f) => f.location.file)).toEqual([path.join(target, 'production.ts')]);
  });

  it('excludes .d.ts declaration files from analysis', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'dts-exclusion');

    const result = await analyze({ path: target });

    expect(result.findings).toEqual([]);
  });

  it('respects a root .gitignore, excluding files it matches', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'gitignore-respect');

    const result = await analyze({ path: target });

    const findings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    expect(findings.map((f) => f.location.file)).toEqual([path.join(target, 'production.ts')]);
  });

  it('analyzes Angular applications, ignoring RxJS/Form controls in direct-instantiation and recognizing entry points', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'angular-support');

    const result = await analyze({ path: target });

    const dipFindings = result.findings.filter((f) => f.ruleId === 'dip/direct-instantiation');
    expect(dipFindings).toHaveLength(1);
    expect(dipFindings[0]?.message).toContain('HeavyCalculator');

    const unusedExportFindings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    const unusedFiles = unusedExportFindings.map((f) => path.basename(f.location.file));
    expect(unusedFiles).not.toContain('main.ts');
  });

  it('analyzes NestJS applications, ignoring NestJS exceptions in direct-instantiation and recognizing entry points', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'nestjs-support');

    const result = await analyze({ path: target });

    const dipFindings = result.findings.filter((f) => f.ruleId === 'dip/direct-instantiation');
    expect(dipFindings).toHaveLength(1);
    expect(dipFindings[0]?.message).toContain('ExternalClient');

    const unusedExportFindings = result.findings.filter((f) => f.ruleId === 'yagni/unused-export');
    const unusedFiles = unusedExportFindings.map((f) => path.basename(f.location.file));
    expect(unusedFiles).not.toContain('main.ts');
  });
});
