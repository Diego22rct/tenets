import { createDefaultRegistry } from './commands/index.js';
import type { CliResult } from './types.js';

export type { CliResult } from './types.js';

export async function runCli(argv: string[]): Promise<CliResult> {
  const registry = createDefaultRegistry();
  return registry.dispatch(argv);
}
