import { describe, expect, it } from 'vitest';
import { CommandRegistry } from './registry.js';
import { InstallCommand } from './install.command.js';
import { AnalyzeCommand } from './analyze.command.js';

describe('CommandRegistry', () => {
  it('routes to install command when "install" is the first argument', async () => {
    const registry = new CommandRegistry();
    registry.register(new InstallCommand());
    registry.registerDefault(new AnalyzeCommand());

    const result = await registry.dispatch(['install', '--help']);
    expect(result.exitCode).toBe(0);
  });

  it('routes to default analyze command for paths and options', async () => {
    const registry = new CommandRegistry();
    registry.register(new InstallCommand());
    registry.registerDefault(new AnalyzeCommand());

    const result = await registry.dispatch(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tenets [path] [options]');
  });

  it('rejects unknown subcommands with usage information', async () => {
    const registry = new CommandRegistry();
    registry.register(new InstallCommand());
    registry.registerDefault(new AnalyzeCommand());

    const result = await registry.dispatch(['unknown-subcommand']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('tenets: unknown command: unknown-subcommand');
    expect(result.stdout).toContain('Allowed commands are: install');
  });
});
