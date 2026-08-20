import { createDefaultRegistry } from './commands/index.js';

const registry = createDefaultRegistry();

export const SUBCOMMANDS = ['install'] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export function isSubcommand(command: string | undefined): command is Subcommand {
  return command !== undefined && registry.has(command);
}

export function looksLikeSubcommand(arg: string): boolean {
  return registry.looksLikeSubcommand(arg);
}

export function unknownCommandMessage(command: string): string {
  return registry.unknownCommandMessage(command);
}
