#!/usr/bin/env node
/**
 * GT-580 criterion 3 — the FACTS a governance rule needs about the exit-code
 * taxonomy, produced outside jest.
 *
 * What exists today is `exit-code-taxonomy.spec.ts`: a jest scan that fails the
 * build when a CLI source names an exit code outside `0|1|2|3`. That is a unit
 * test of one package, not governance — it does not reach the ruleset engine, it
 * cannot be evaluated against a satellite, and it has no Rego parity, so the
 * criterion asks for a ruleset instead.
 *
 * A ruleset cannot assert anything it has no facts about, and nothing in the
 * evaluation context described the CLI's exit codes. This script is that missing
 * half, and it lives here because the sources it reads live here:
 *
 *     node scripts/exit-code-taxonomy-facts.mjs            # human summary
 *     node scripts/exit-code-taxonomy-facts.mjs --json     # the fact document
 *
 * The document is shaped for `input.core.cli.exitCodes` so the rule (`CLI-EXIT-01`,
 * drafted in the GT-580 hand-over) is a two-line Rego predicate over it rather
 * than a policy that re-implements a file scan.
 *
 * Exit codes are drawn from the taxonomy this script is about: `0` clean,
 * `2` offenders found (a blocking verdict), `3` bad invocation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, '..', 'src');

/** The published taxonomy. Mirrored from `src/infrastructure/cli/exit-codes.ts`. */
const TAXONOMY = { OK: 0, TOOL_FAILURE: 1, BLOCKED: 2, INVALID_INPUT: 3 };
const ALLOWED = new Set(Object.values(TAXONOMY));

/** `process.exit(N)` / `process.exitCode = N` with a numeric literal. */
const EXIT_LITERAL = /process\.exit\(\s*(-?\d+)\s*\)|process\.exitCode\s*=\s*(-?\d+)/g;

export function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__mocks__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    out.push(full);
  }
  return out;
}

/**
 * Scan a source tree and return the fact document.
 *
 * `scanned` is reported so a consumer can reject a vacuous green: a scan that
 * found no files also finds no offenders, and that is not compliance.
 */
export function collectExitCodeFacts(root = SRC_ROOT) {
  const files = sourceFiles(root);
  const offenders = [];
  const observed = new Set();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(EXIT_LITERAL)) {
      const code = Number(match[1] ?? match[2]);
      observed.add(code);
      if (!ALLOWED.has(code)) {
        offenders.push({ file: relative(root, file), code, snippet: match[0] });
      }
    }
  }

  return {
    schemaVersion: '1.0.0',
    declared: [...ALLOWED].sort((a, b) => a - b),
    observed: [...observed].sort((a, b) => a - b),
    scanned: files.length,
    offenders,
    compliant: offenders.length === 0 && files.length > 0,
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const asJson = process.argv.includes('--json');
  const unknown = process.argv.slice(2).filter((a) => a !== '--json');
  if (unknown.length > 0) {
    process.stderr.write(`Unknown argument(s): ${unknown.join(', ')}\n`);
    process.exit(TAXONOMY.INVALID_INPUT);
  }

  const facts = collectExitCodeFacts();
  if (asJson) {
    // Data on stdout, diagnostics on stderr — the same contract this gap is about.
    process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
  } else {
    process.stderr.write(
      `exit-code taxonomy: ${facts.scanned} sources scanned, ` +
        `codes observed [${facts.observed.join(', ')}], ` +
        `${facts.offenders.length} offender(s)\n`,
    );
    for (const offender of facts.offenders) {
      process.stderr.write(`  ${offender.file}: ${offender.snippet}\n`);
    }
  }
  process.exit(facts.compliant ? TAXONOMY.OK : TAXONOMY.BLOCKED);
}
