import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../../core/types.js';
import { formatTerminal } from './terminal.formatter.js';
import { formatJson } from './json.formatter.js';

describe('formatTerminal', () => {
  it('formats clean analysis output with framework line', () => {
    const result: AnalysisResult = {
      findings: [],
      skippedFiles: [],
      score: 0,
      framework: 'hono',
      frameworks: ['hono'],
    };

    const output = formatTerminal(result, { isTTY: false });
    expect(output).toContain('tenets: no violations found');
    expect(output).toContain('tenets: framework: Hono (specialized rules applied)');
  });

  it('formats findings grouped by file with score gauge and summary', () => {
    const result: AnalysisResult = {
      findings: [
        {
          ruleId: 'srp/function-length',
          principle: 'SOLID',
          severity: 'warning',
          confidence: 'high',
          message: 'Function too long',
          location: {
            file: '/project/src/service.ts',
            startLine: 10,
            startColumn: 1,
            endLine: 40,
            endColumn: 1,
          },
        },
      ],
      skippedFiles: [],
      score: 15.0,
      framework: 'unspecialized',
      frameworks: [],
    };

    const output = formatTerminal(result, { isTTY: false });
    expect(output).toContain('/project/src/service.ts:');
    expect(output).toContain('[warning] srp/function-length :10');
    expect(output).toContain('Function too long');
    expect(output).toContain('1 finding(s)');
    expect(output).toContain('15 findings/KLOC');
  });

  it('includes skipped files if any exist', () => {
    const result: AnalysisResult = {
      findings: [],
      skippedFiles: ['/project/src/corrupted.ts'],
      score: 0,
    };

    const output = formatTerminal(result, { isTTY: false });
    expect(output).toContain('1 file(s) could not be analyzed: /project/src/corrupted.ts');
  });
});

describe('formatJson', () => {
  it('serializes AnalysisResult into the expected JSON structure', () => {
    const result: AnalysisResult = {
      findings: [
        {
          ruleId: 'dip/direct-instantiation',
          principle: 'SOLID',
          severity: 'info',
          confidence: 'medium',
          message: 'Direct instantiation',
          location: {
            file: '/project/src/order.ts',
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
        },
      ],
      skippedFiles: [],
      score: 5.5,
      framework: 'nestjs',
      frameworks: ['nestjs'],
    };

    const jsonString = formatJson(result);
    const parsed = JSON.parse(jsonString);

    expect(parsed.summary.totalFindings).toBe(1);
    expect(parsed.summary.score).toBe(5.5);
    expect(parsed.framework).toBe('nestjs');
    expect(parsed.files['/project/src/order.ts']).toHaveLength(1);
    expect(parsed.skippedFiles).toEqual([]);
  });
});
