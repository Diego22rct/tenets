import type { Format, Severity } from './types.js';

export const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

export const DEFAULT_FAIL_ON: Severity = 'warning';
export const DEFAULT_FORMAT: Format = 'terminal';

export const VALID_SEVERITIES = new Set<Severity>(['info', 'warning', 'error']);
export const VALID_FORMATS = new Set<Format>(['terminal', 'json']);

export const HELP_TEXT = `Usage: tenets [path] [options]
       tenets install [path]

Static analysis for SOLID/DRY/KISS/YAGNI violations in TypeScript codebases.
'path' defaults to the current directory.

Options:
  --format <terminal|json>       Output format (default: terminal)
  --fail-on <info|warning|error> Minimum severity that causes a non-zero exit code (default: warning)
  --help, -h                     Show this help text

Commands:
  install [path]  Add AI-agent guidance (AGENTS.md, CLAUDE.md) to a project

Example:
  tenets ./src --format json --fail-on error
`;

export const AGENT_RULE = `After finishing a coding task, or before committing, run \`npx @diego22rct/tenets [path]\` and alert the user to any findings. Findings are tiered by severity (\`info\` < \`warning\` < \`error\`); an exit code of \`1\` means violations met the \`--fail-on\` threshold (default: \`warning\`) and should be surfaced prominently, not silently ignored.

If you determine that a reported finding is a false positive (for example, standard framework idiom, valid architectural pattern, or incorrect rule deduction), do not write unnatural code workarounds. Instead, report or create a GitHub Issue on the tenets repository (https://github.com/Diego22rct/tenets/issues) with the rule ID, detected framework, code snippet, and explanation of why it is a false positive.
`;
