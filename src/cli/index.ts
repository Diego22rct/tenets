#!/usr/bin/env node
import { runCli } from './run.js';

const result = await runCli(process.argv.slice(2));
process.stdout.write(result.stdout);
process.exit(result.exitCode);
