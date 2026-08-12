import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './run.js';

const cliFixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const coreFixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'core', '__fixtures__');

async function withTty<T>(isTTY: boolean, fn: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', { value: isTTY, configurable: true });
  try {
    return await fn();
  } finally {
    if (original) {
      Object.defineProperty(process.stdout, 'isTTY', original);
    } else {
      delete (process.stdout as { isTTY?: boolean }).isTTY;
    }
  }
}

describe('runCli', () => {
  it('colors the [warning] severity tag yellow when stdout is a TTY', async () => {
    const target = path.join(coreFixturesDir, 'srp-function-length');

    const result = await withTty(true, () => runCli([target]));

    expect(result.stdout).toContain('\x1b[33m[warning]\x1b[39m');
  });

  it('shows a full red score gauge when the score is at or above the 20 findings/KLOC cap', async () => {
    const target = path.join(coreFixturesDir, 'quality-score');

    const result = await withTty(true, () => runCli([target, '--fail-on', 'info']));

    expect(result.stdout).toContain(`\x1b[31m${'█'.repeat(10)}\x1b[39m`);
  });

  it('shows a half-filled yellow score gauge at exactly 10 findings/KLOC', async () => {
    const target = path.join(cliFixturesDir, 'mid-score');

    const result = await withTty(true, () => runCli([target]));

    expect(result.stdout).toContain('10 findings/KLOC');
    expect(result.stdout).toContain(`\x1b[33m${'█'.repeat(5)}${'░'.repeat(5)}\x1b[39m`);
  });

  it('does not color the severity tag when stdout is not a TTY', async () => {
    const target = path.join(coreFixturesDir, 'srp-function-length');

    const result = await withTty(false, () => runCli([target]));

    expect(result.stdout).not.toContain('\x1b[33m');
    expect(result.stdout).toContain('[warning]');
  });

  it('exits 0 with a clean report when no findings meet the default fail-on threshold', async () => {
    const target = path.join(cliFixturesDir, 'info-only');

    const result = await runCli([target]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('dip/direct-instantiation');
  });

  it('exits 1 and lists findings in terminal format when violations meet the default threshold', async () => {
    const target = path.join(coreFixturesDir, 'srp-function-length');

    const result = await runCli([target]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('srp/function-length');
  });

  it('groups findings by file with a summary line in terminal format', async () => {
    const target = path.join(cliFixturesDir, 'info-only');

    const result = await runCli([target, '--fail-on', 'info']);

    const orderServiceFile = path.join(target, 'order-service.ts');
    const fileHeaderIndex = result.stdout.indexOf(orderServiceFile);
    const findingIndex = result.stdout.indexOf('dip/direct-instantiation');
    expect(fileHeaderIndex).toBeGreaterThanOrEqual(0);
    expect(findingIndex).toBeGreaterThan(fileHeaderIndex);
    expect(result.stdout).toContain('1 finding(s)');
    expect(result.stdout).toMatch(/[\d.]+ findings\/KLOC/);
  });

  it('outputs findings grouped by file with a summary when --format json is passed', async () => {
    const target = path.join(cliFixturesDir, 'info-only');

    const result = await runCli([target, '--format', 'json']);

    const parsed = JSON.parse(result.stdout) as {
      summary: { totalFindings: number; score: number };
      files: Record<string, Array<{ ruleId: string }>>;
      skippedFiles: string[];
    };
    const orderServiceFile = path.join(target, 'order-service.ts');
    expect(parsed.summary.totalFindings).toBe(1);
    expect(parsed.files[orderServiceFile]?.[0]?.ruleId).toBe('dip/direct-instantiation');
    expect(parsed.skippedFiles).toEqual([]);
  });

  it('lowers the fail-on threshold to info, flipping an info-only result to exit 1', async () => {
    const target = path.join(cliFixturesDir, 'info-only');

    const result = await runCli([target, '--fail-on', 'info']);

    expect(result.exitCode).toBe(1);
  });

  it('exits 2 when the target path does not exist', async () => {
    const target = path.join(cliFixturesDir, 'does-not-exist');

    const result = await runCli([target]);

    expect(result.exitCode).toBe(2);
  });

  it('surfaces the underlying error message when the target path does not exist', async () => {
    const target = path.join(cliFixturesDir, 'does-not-exist');

    const result = await runCli([target]);

    expect(result.stdout).toContain(target);
    expect(result.stdout).not.toBe(`tenets: failed to analyze '${target}'\n`);
  });

  it('prints usage and exits 0 when --help is passed, taking priority over other flags', async () => {
    const result = await runCli(['--help', '--format', 'json', 'some/bogus/path']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tenets [path] [options]');
    expect(result.stdout).toContain('--format');
    expect(result.stdout).toContain('--fail-on');
  });

  it('also accepts -h as a shorthand for --help', async () => {
    const result = await runCli(['-h']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tenets [path] [options]');
  });

  it('creates AGENTS.md and CLAUDE.md with agent guidance when installing in a fresh directory', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-install-'));

    const result = await runCli(['install', dir]);

    expect(result.exitCode).toBe(0);
    const agentsContent = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    const claudeContent = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    expect(agentsContent).toContain('npx @diego22rct/tenets');
    expect(claudeContent).toContain('npx @diego22rct/tenets');

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('appends to an existing AGENTS.md/CLAUDE.md instead of overwriting their content', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-install-'));
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# My project\n\nSome existing notes.\n');
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# My project\n\nSome existing notes.\n');

    const result = await runCli(['install', dir]);

    expect(result.exitCode).toBe(0);
    const agentsContent = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    const claudeContent = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    expect(agentsContent).toContain('Some existing notes.');
    expect(agentsContent).toContain('npx @diego22rct/tenets');
    expect(claudeContent).toContain('Some existing notes.');
    expect(claudeContent).toContain('npx @diego22rct/tenets');

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('does not duplicate the rule when install runs a second time', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-install-'));

    await runCli(['install', dir]);
    await runCli(['install', dir]);

    const agentsContent = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    const occurrences = agentsContent.split('npx @diego22rct/tenets').length - 1;
    expect(occurrences).toBe(1);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('--help still takes priority over the install subcommand', async () => {
    const result = await runCli(['install', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tenets [path] [options]');
  });

  it('mentions the install subcommand in --help output', async () => {
    const result = await runCli(['--help']);

    expect(result.stdout).toContain('install');
  });
});
