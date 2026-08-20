import type { Finding } from '../core/types.js';

export interface CliResult {
  exitCode: number;
  stdout: string;
}

export type Severity = Finding['severity'];
export type Format = 'terminal' | 'json';

export interface CliOptions {
  path: string;
  format: Format;
  failOn: Severity;
  help?: boolean;
}

export interface Command {
  name: string;
  description: string;
  execute(argv: string[]): Promise<CliResult> | CliResult;
}
