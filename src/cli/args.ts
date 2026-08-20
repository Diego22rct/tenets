import { DEFAULT_FAIL_ON, DEFAULT_FORMAT, VALID_FORMATS, VALID_SEVERITIES } from './constants.js';
import type { CliOptions, Format, Severity } from './types.js';

export function parseCliArgs(argv: string[]): CliOptions {
  let targetPath = '.';
  let format: Format = DEFAULT_FORMAT;
  let failOn: Severity = DEFAULT_FAIL_ON;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--format') {
      const next = argv[++i];
      if (next && isFormat(next)) format = next;
    } else if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length);
      if (isFormat(value)) format = value;
    } else if (arg === '--fail-on') {
      const next = argv[++i];
      if (next && isSeverity(next)) failOn = next;
    } else if (arg.startsWith('--fail-on=')) {
      const value = arg.slice('--fail-on='.length);
      if (isSeverity(value)) failOn = value;
    } else if (!arg.startsWith('-')) {
      targetPath = arg;
    }
  }

  return { path: targetPath, format, failOn, help };
}

function isFormat(value: string): value is Format {
  return VALID_FORMATS.has(value as Format);
}

function isSeverity(value: string): value is Severity {
  return VALID_SEVERITIES.has(value as Severity);
}
