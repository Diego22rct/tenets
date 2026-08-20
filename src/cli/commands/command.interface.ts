import type { CliResult } from '../types.js';

export interface Command {
  readonly name: string;
  readonly description: string;
  execute(argv: string[]): Promise<CliResult> | CliResult;
}
