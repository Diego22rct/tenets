import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './run.js';

const cliFixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const coreFixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'core', '__fixtures__');

describe('runCli', () => {
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

  it('outputs valid JSON when --format json is passed', async () => {
    const target = path.join(coreFixturesDir, 'srp-function-length');

    const result = await runCli([target, '--format', 'json']);

    const parsed = JSON.parse(result.stdout) as { findings: Array<{ ruleId: string }> };
    expect(parsed.findings.some((f) => f.ruleId === 'srp/function-length')).toBe(true);
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
