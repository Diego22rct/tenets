import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { InstallCommand } from './install.command.js';

describe('InstallCommand', () => {
  it('creates AGENTS.md and CLAUDE.md in target directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-cmd-install-'));
    const command = new InstallCommand();

    const result = command.execute([dir]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('installed agent guidance');
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('appends to existing files without duplicating rules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenets-cmd-install-'));
    const agentsFile = path.join(dir, 'AGENTS.md');
    fs.writeFileSync(agentsFile, '# Existing Rules\n');

    const command = new InstallCommand();
    command.execute([dir]);
    command.execute([dir]);

    const content = fs.readFileSync(agentsFile, 'utf8');
    expect(content).toContain('# Existing Rules');
    const occurrences = content.split('npx @diego22rct/tenets').length - 1;
    expect(occurrences).toBe(1);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
