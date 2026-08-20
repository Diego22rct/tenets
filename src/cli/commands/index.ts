import { AnalyzeCommand } from './analyze.command.js';
import { CommandRegistry } from './registry.js';
import { InstallCommand } from './install.command.js';

export function createDefaultRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(new InstallCommand());
  registry.registerDefault(new AnalyzeCommand());
  return registry;
}

export { AnalyzeCommand, CommandRegistry, InstallCommand };
export type { Command } from './command.interface.js';
