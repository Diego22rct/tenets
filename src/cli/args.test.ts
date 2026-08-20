import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './args.js';

describe('parseCliArgs', () => {
  it('returns default options when no arguments are passed', () => {
    const options = parseCliArgs([]);
    expect(options).toEqual({
      path: '.',
      format: 'terminal',
      failOn: 'warning',
      help: false,
    });
  });

  it('parses target path positional argument', () => {
    const options = parseCliArgs(['src/core']);
    expect(options.path).toBe('src/core');
  });

  it('parses --format option with space and with equals', () => {
    expect(parseCliArgs(['--format', 'json']).format).toBe('json');
    expect(parseCliArgs(['--format=json']).format).toBe('json');
  });

  it('parses --fail-on option with space and with equals', () => {
    expect(parseCliArgs(['--fail-on', 'error']).failOn).toBe('error');
    expect(parseCliArgs(['--fail-on=info']).failOn).toBe('info');
  });

  it('detects --help and -h flags', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
    expect(parseCliArgs(['-h']).help).toBe(true);
    expect(parseCliArgs(['src', '-h']).help).toBe(true);
  });

  it('falls back to default format and failOn for unrecognized values', () => {
    expect(parseCliArgs(['--format', 'invalid']).format).toBe('terminal');
    expect(parseCliArgs(['--fail-on', 'invalid']).failOn).toBe('warning');
  });

  it('correctly combines flags and positional path in any order', () => {
    const options = parseCliArgs(['--format', 'json', 'src/services', '--fail-on', 'error']);
    expect(options).toEqual({
      path: 'src/services',
      format: 'json',
      failOn: 'error',
      help: false,
    });
  });
});
