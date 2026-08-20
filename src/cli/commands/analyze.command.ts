import { analyze } from '../../core/analyze.js';
import type { AnalysisResult } from '../../core/types.js';
import { parseCliArgs } from '../args.js';
import { HELP_TEXT, SEVERITY_ORDER } from '../constants.js';
import { formatResult } from '../formatters/index.js';
import type { CliResult } from '../types.js';
import type { Command } from './command.interface.js';

export class AnalyzeCommand implements Command {
  readonly name = 'analyze';
  readonly description = 'Static analysis for SOLID/DRY/KISS/YAGNI violations in TypeScript codebases';

  async execute(argv: string[]): Promise<CliResult> {
    const options = parseCliArgs(argv);

    if (options.help) {
      return { exitCode: 0, stdout: HELP_TEXT };
    }

    let result: AnalysisResult;
    try {
      result = await analyze({ path: options.path });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { exitCode: 2, stdout: `tenets: failed to analyze '${options.path}': ${message}\n` };
    }

    const stdout = formatResult(result, options.format);
    const failing = result.findings.some(
      (f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[options.failOn],
    );

    return { exitCode: failing ? 1 : 0, stdout };
  }
}
