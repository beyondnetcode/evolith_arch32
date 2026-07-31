#!/usr/bin/env node
/**
 * `evolith-repo-facts` — extract a content-hashed `RepoFacts` package (GT-589).
 *
 * This binary is the whole point of the seam: extraction is an ORCHESTRATION step
 * a consumer (Tracker, CI, CLI, agent) runs against a repository it can read, and
 * the resulting value is handed to the stateless Core inline on the
 * `EvaluationContext`. The Core never shells out to this.
 *
 *   evolith-repo-facts --root . --include src --out facts.json [--revision <sha>]
 *                      [--omit-timestamp] [--print-hash]
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTypeScriptFacts } from './typescript-fact-extractor';
import { serializeRepoFacts } from './serialize';

interface Args {
  root: string;
  include: string[];
  out?: string;
  revision?: string;
  omitTimestamp: boolean;
  printHash: boolean;
}

export function parseArgs(argv: readonly string[]): Args {
  const args: Args = { root: process.cwd(), include: [], omitTimestamp: false, printHash: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--root') args.root = argv[i += 1];
    else if (flag === '--include') args.include.push(argv[i += 1]);
    else if (flag === '--out') args.out = argv[i += 1];
    else if (flag === '--revision') args.revision = argv[i += 1];
    else if (flag === '--omit-timestamp') args.omitTimestamp = true;
    else if (flag === '--print-hash') args.printHash = true;
    else throw new Error('Unknown argument: ' + flag);
  }
  return args;
}

export function run(argv: readonly string[]): number {
  const args = parseArgs(argv);
  const facts = extractTypeScriptFacts({
    rootDir: args.root,
    include: args.include.length > 0 ? args.include : ['src'],
    ...(args.revision ? { revision: args.revision } : {}),
  });
  const json = serializeRepoFacts(facts, { omitTimestamp: args.omitTimestamp });
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
  } else {
    process.stdout.write(json);
  }
  if (args.printHash) process.stderr.write(facts.contentHash + '\n');
  return 0;
}

/* istanbul ignore next -- entrypoint guard */
if (require.main === module) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(String(error instanceof Error ? error.message : error) + '\n');
    process.exitCode = 1;
  }
}
