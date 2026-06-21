#!/usr/bin/env node
// GT-159 / ADR-0098 — REST URI versioning native rule.
//
// Fails when a controller in apps/core-api/src/presentation/controllers/
// declares @Controller(...) without an explicit `version:` field and without
// `VERSION_NEUTRAL`. VERSION_NEUTRAL controllers must carry a comment with
// the token `version-neutral-justification` above the decorator.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';

const ROOT = resolve(process.cwd());
const CONTROLLERS_DIR = join(
  ROOT,
  'apps/core-api/src/presentation/controllers',
);

function listControllerFiles(dir) {
  const entries = readdirSync(dir);
  return entries
    .filter((name) => name.endsWith('.controller.ts'))
    .filter((name) => !name.endsWith('.spec.ts'))
    .map((name) => join(dir, name));
}

function findControllerDecorator(content) {
  // Match @Controller( ... ) with possibly multi-line argument; balanced parens
  // for our simple cases — controller decorators are short.
  const regex = /@Controller\s*\(([^)]*)\)/m;
  const match = regex.exec(content);
  if (!match) return null;
  return { args: match[1], index: match.index };
}

function precedingLines(content, index, count = 3) {
  const slice = content.slice(0, index);
  const lines = slice.split('\n');
  return lines.slice(-count - 1, -1).join('\n');
}

function check(file) {
  const content = readFileSync(file, 'utf8');
  const decorator = findControllerDecorator(content);
  if (!decorator) {
    return { file, ok: false, reason: '@Controller decorator not found' };
  }

  const args = decorator.args.trim();
  const hasVersion = /version\s*:/.test(args);
  const isNeutral = /VERSION_NEUTRAL/.test(args);

  if (!hasVersion && !isNeutral) {
    return {
      file,
      ok: false,
      reason:
        '@Controller must declare `version` (e.g. `{ path, version: "1" }`) or `VERSION_NEUTRAL` per ADR-0098',
    };
  }

  if (isNeutral) {
    const preamble = precedingLines(content, decorator.index, 4);
    if (!preamble.includes('version-neutral-justification')) {
      return {
        file,
        ok: false,
        reason:
          'VERSION_NEUTRAL controller missing required `version-neutral-justification` comment (ADR-0098 §1)',
      };
    }
  }

  return { file, ok: true };
}

function main() {
  let files;
  try {
    statSync(CONTROLLERS_DIR);
    files = listControllerFiles(CONTROLLERS_DIR);
  } catch {
    console.error(`Controllers directory not found: ${CONTROLLERS_DIR}`);
    process.exit(2);
  }

  const results = files.map(check);
  const failures = results.filter((r) => !r.ok);

  if (failures.length === 0) {
    console.log(
      `✓ REST versioning rule (ADR-0098) passed for ${results.length} controllers.`,
    );
    process.exit(0);
  }

  console.error('✗ REST versioning rule (ADR-0098) failed:');
  for (const f of failures) {
    console.error(`  - ${f.file.replace(ROOT + '/', '')}: ${f.reason}`);
  }
  process.exit(1);
}

main();
