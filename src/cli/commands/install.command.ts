import fs from 'node:fs';
import path from 'node:path';
import { AGENT_RULE } from '../constants.js';
import type { CliResult } from '../types.js';
import type { Command } from './command.interface.js';

export class InstallCommand implements Command {
  readonly name = 'install';
  readonly description = 'Add AI-agent guidance (AGENTS.md, CLAUDE.md) to a project';

  execute(argv: string[]): CliResult {
    const targetPath = argv[0] ?? '.';
    const resolvedPath = path.resolve(targetPath);

    for (const filename of ['AGENTS.md', 'CLAUDE.md']) {
      this.writeAgentRule(path.join(resolvedPath, filename));
    }

    return { exitCode: 0, stdout: 'tenets: installed agent guidance in AGENTS.md, CLAUDE.md\n' };
  }

  private writeAgentRule(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, AGENT_RULE);
      return;
    }
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing.includes('npx @diego22rct/tenets')) return;
    fs.appendFileSync(filePath, `\n${AGENT_RULE}`);
  }
}
