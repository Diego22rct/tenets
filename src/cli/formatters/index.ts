import type { AnalysisResult } from '../../core/types.js';
import type { Format } from '../types.js';
import { formatJson } from './json.formatter.js';
import { formatTerminal, type TerminalFormatterOptions } from './terminal.formatter.js';

export function formatResult(
  result: AnalysisResult,
  format: Format,
  options?: TerminalFormatterOptions,
): string {
  switch (format) {
    case 'json':
      return formatJson(result);
    case 'terminal':
    default:
      return formatTerminal(result, options);
  }
}

export { formatJson, formatTerminal };
