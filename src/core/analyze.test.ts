import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyze } from './analyze.js';

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));

describe('analyze', () => {
  it('flags a function whose body exceeds the LOC threshold as srp/function-length', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'srp-function-length');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'srp/function-length');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('SRP');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'long-function.ts'));
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
    expect(finding?.principle).toBe('SRP');
    expect(finding?.severity).toBe('warning');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'big-class.ts'));
  });

  it('flags a `new` expression inside a class method as dip/direct-instantiation', async () => {
    const target = path.join(fixturesDir, '__fixtures__', 'dip-direct-instantiation');

    const result = await analyze({ path: target });

    const finding = result.findings.find((f) => f.ruleId === 'dip/direct-instantiation');
    expect(finding).toBeDefined();
    expect(finding?.principle).toBe('DIP');
    expect(finding?.severity).toBe('info');
    expect(finding?.confidence).toBe('medium');
    expect(finding?.location.file).toBe(path.join(target, 'order-service.ts'));
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
});
