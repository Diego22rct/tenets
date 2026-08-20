import fs from 'node:fs';
import path from 'node:path';
import { HELP_TEXT } from '../constants.js';
import type { CliResult } from '../types.js';
import type { Command } from './command.interface.js';

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private defaultCommand?: Command;

  register(command: Command): this {
    this.commands.set(command.name, command);
    return this;
  }

  registerDefault(command: Command): this {
    this.defaultCommand = command;
    return this;
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  async dispatch(argv: string[]): Promise<CliResult> {
    if (argv.includes('--help') || argv.includes('-h')) {
      return { exitCode: 0, stdout: HELP_TEXT };
    }

    const firstArg = argv[0];
    if (firstArg && this.looksLikeSubcommand(firstArg)) {
      const command = this.get(firstArg);
      if (command) {
        return command.execute(argv.slice(1));
      }
      return { exitCode: 2, stdout: this.unknownCommandMessage(firstArg) };
    }

    if (this.defaultCommand) {
      return this.defaultCommand.execute(argv);
    }

    return { exitCode: 0, stdout: HELP_TEXT };
  }

  looksLikeSubcommand(arg: string): boolean {
    if (this.has(arg)) return true;
    if (arg.startsWith('-') || arg.startsWith('.') || /[\\/]/.test(arg) || path.extname(arg) !== '') {
      return false;
    }
    if (fs.existsSync(arg)) return false;
    return true;
  }

  unknownCommandMessage(command: string): string {
    const allowed = Array.from(this.commands.keys()).join(', ');
    return `tenets: unknown command: ${command}\nAllowed commands are: ${allowed}\nRun '@diego22rct/tenets --help' for usage information.\n`;
  }
}
