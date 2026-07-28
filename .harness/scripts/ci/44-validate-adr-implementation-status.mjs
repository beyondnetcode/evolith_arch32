#!/usr/bin/env node

/**
 * GT-607 — an Accepted ADR must say, in machine-readable form, what implements it.
 *
 * WHY THIS EXISTS
 * Seven agentic ADRs (0081, 0082, 0086, 0088, 0089, 0092, 0094) sat at `Accepted`
 * with zero implementing code. An evaluator who reads the ADR index and greps once
 * finds seven Accepted decisions backed by nothing, which is the fastest available
 * way to lose a technical due diligence. The 2026-07-28 wave annotated all seven
 * honestly. Nothing stops the annotation from being deleted, or the next ADR from
 * repeating the pattern — hence this guard.
 *
 * WHAT SIGNAL THIS USES, AND WHY NOT A GREP
 * The obvious design is "grep `src/` for the ADR's defining artifacts and fail when
 * there are no hits". That was rejected after trying it against this corpus: an ADR
 * has no reliable, machine-derivable fingerprint. `0092-agent-infinite-loop-prevention`
 * would be searched for what — "loop"? `0049-naming-semantics-clean-code-policy` is
 * implemented by a linting convention that names nothing. Meanwhile the seven ADRs
 * that ARE unimplemented all have generated rulesets and ES/EN copies whose text
 * matches every keyword you would search for. A guard built on that signal produces
 * both false positives and false negatives on the very corpus it was written for,
 * and a guard that cries wolf gets deleted.
 *
 * So the signal is a DECLARATION the author makes and this guard falsifies:
 *
 *     <!-- implementation-status: none -->
 *     <!-- implementation-status: src/packages/agent-runtime/src/adapters/x.ts, src/rulesets/... -->
 *
 * An HTML comment: invisible in the rendered document, unambiguous to parse, and
 * impossible to satisfy accidentally. `none` is a legitimate, permanent answer —
 * most of this corpus is normative standards published FOR SATELLITES, and saying
 * so is the honest outcome the gap asked for, not a failure. Any other value is a
 * comma-separated list of repo-relative paths, and **every one must exist on disk**.
 * That is the falsifiable half: an ADR that claims `foo.ts` implements it goes red
 * the day `foo.ts` is deleted or moved, which is the drift this repository actually
 * suffers from. What the guard deliberately does NOT claim is that the named file
 * implements the decision — no automated check can know that, and pretending
 * otherwise is how the maturity assessment got into trouble (GT-576).
 *
 * BASELINE, NOT BIG BANG
 * ~96 ADRs are Accepted today and predate the convention; annotating all of them is
 * a separate, larger piece of work. They are recorded in the baseline JSON, counted
 * out loud on every run, and required to SHRINK: an entry whose ADR has since gained
 * a directive is a violation, so the list cannot silently become decoration. New and
 * modified ADRs get no such grace. `--strict` makes any remaining entry fatal, which
 * is the switch to flip once the backlog is worked off.
 *
 * ANTI-VACUOUS PASS
 * Zero ADRs discovered is a hard failure, not "all ADRs compliant".
 *
 * Usage:
 *   node .harness/scripts/ci/44-validate-adr-implementation-status.mjs
 *   node .harness/scripts/ci/44-validate-adr-implementation-status.mjs --verbose
 *   node .harness/scripts/ci/44-validate-adr-implementation-status.mjs --strict
 *   node .harness/scripts/ci/44-validate-adr-implementation-status.mjs --write-baseline
 *   node .harness/scripts/ci/44-validate-adr-implementation-status.mjs --root <dir>
 *
 * Exit codes:
 *   0 - every Accepted ADR declares an implementation status, or is baselined
 *   1 - an undeclared Accepted ADR, a declaration pointing at a path that does not
 *       exist, an EN/ES declaration mismatch, a stale baseline entry, a zero-ADR
 *       scan, or (with --strict) any remaining baseline entry
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '44-validate-adr-implementation-status';
const ADR_ROOT = join('reference', 'core', 'architecture', 'adrs');
const BASELINE_FILE = join(__dirname, '44-adr-implementation-status.baseline.json');

const DIRECTIVE_RE = /<!--\s*implementation-status:\s*([^>]*?)\s*-->/;

/** Status words that mean "this decision is in force". */
const ACCEPTED_RE = /^\**\s*Accepted\b/i;
/** Status words that mean it is not, and therefore carry no implementation claim. */
const NOT_IN_FORCE_RE = /^\**\s*(Proposed|Draft|Superseded|Deprecated|Rejected|Withdrawn|Propuesto|Borrador|Reemplazado|Obsoleto|Rechazado)\b/i;

/**
 * Recursively collect ADR markdown files. READMEs, matrices and authoring
 * standards are indexes, not decisions, and carry no status.
 *
 * @param {string} dir absolute directory
 * @param {string} root absolute repo root, for relative reporting
 * @returns {string[]} repo-relative paths
 */
export function collectAdrFiles(dir, root) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      if (/^README/i.test(entry.name)) continue;
      if (/^adr-matrix/i.test(entry.name)) continue;
      if (/^adr-authoring-standard/i.test(entry.name)) continue;
      out.push(relative(root, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Extract the declared status and the implementation-status directive.
 *
 * The corpus writes the status a dozen ways (`## Status` / `## Estado`, with or
 * without a blank line, `**Status:** Accepted`, `Accepted — Board, 2026-06-20`),
 * so this takes the first meaningful line of the status section rather than
 * demanding an exact match.
 *
 * @param {string} content
 * @returns {{ status: string|null, accepted: boolean, directive: string|null }}
 */
export function parseAdr(content) {
  const directiveMatch = content.match(DIRECTIVE_RE);
  const directive = directiveMatch ? directiveMatch[1].trim() : null;

  let status = null;
  const heading = content.match(/^#{2,3}\s*(Status|Estado)\s*$/im);
  if (heading) {
    const after = content.slice(heading.index + heading[0].length);
    for (const raw of after.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('<!--')) continue;
      if (line.startsWith('>')) continue;
      if (line.startsWith('#')) break; // ran into the next section: empty status
      status = line;
      break;
    }
  }
  if (status === null) {
    // `**Status:** Accepted ...` on a single line, anywhere in the preamble.
    const inline = content.match(/^\**\s*(?:Status|Estado)\s*:?\**\s*[:\-—]\s*(.+)$/im);
    if (inline) status = inline[1].trim();
  }

  const accepted = status !== null && ACCEPTED_RE.test(status) && !NOT_IN_FORCE_RE.test(status);
  return { status, accepted, directive };
}

/** `0081-agentic-ai-sandbox-isolation.es.md` -> `0081-agentic-ai-sandbox-isolation.md` */
function englishSibling(relPath) {
  return relPath.endsWith('.es.md') ? relPath.replace(/\.es\.md$/, '.md') : null;
}

function loadBaseline(file) {
  if (!existsSync(file)) return { undeclared: [], unparseableStatus: [] };
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return {
    undeclared: parsed.undeclared ?? [],
    unparseableStatus: parsed.unparseableStatus ?? [],
  };
}

/**
 * @param {{ root: string, strict: boolean, verbose: boolean, writeBaseline: boolean }} opts
 * @returns {{ violations: string[], scanned: number, undeclared: string[], unparseable: string[], declared: number, none: number }}
 */
export function evaluate(opts) {
  const root = resolve(opts.root);
  const files = collectAdrFiles(join(root, ADR_ROOT), root);
  const violations = [];

  if (files.length === 0) {
    return {
      violations: [
        `scanned ${join(root, ADR_ROOT)} and found ZERO ADR files — the corpus moved, and this guard verified nothing.`,
      ],
      scanned: 0,
      undeclared: [],
      unparseable: [],
      declared: 0,
      none: 0,
    };
  }

  const baselineFile = opts.baselineFile ?? BASELINE_FILE;
  const baseline = opts.writeBaseline ? { undeclared: [], unparseableStatus: [] } : loadBaseline(baselineFile);
  const baselinedUndeclared = new Set(baseline.undeclared);
  const baselinedUnparseable = new Set(baseline.unparseableStatus);

  const parsed = new Map();
  for (const rel of files) {
    parsed.set(rel, parseAdr(readFileSync(join(root, rel), 'utf8')));
  }

  const undeclared = [];
  const unparseable = [];
  let declared = 0;
  let none = 0;

  for (const rel of files) {
    const adr = parsed.get(rel);

    if (adr.status === null) {
      unparseable.push(rel);
      if (!baselinedUnparseable.has(rel)) {
        violations.push(
          `${rel}: no parseable Status section. An ADR whose status cannot be read cannot be governed; ` +
            `add a "## Status" section, or register it in ${baselineFile}.`,
        );
      }
      continue;
    }

    if (!adr.accepted) continue; // Proposed/Superseded/... carry no implementation claim

    if (adr.directive === null) {
      undeclared.push(rel);
      if (!baselinedUndeclared.has(rel)) {
        violations.push(
          `${rel}: Status is "${adr.status}" but the ADR declares no implementation status. ` +
            `Add "<!-- implementation-status: none -->" (a legitimate answer for a standard published for satellites) ` +
            `or "<!-- implementation-status: <path>[, <path>] -->" naming what implements it.`,
        );
      }
      continue;
    }

    declared += 1;

    if (adr.directive.toLowerCase() === 'none') {
      none += 1;
    } else {
      const paths = adr.directive
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (paths.length === 0) {
        violations.push(
          `${rel}: empty implementation-status directive. Use "none" explicitly rather than leaving it blank.`,
        );
      }
      for (const p of paths) {
        if (!existsSync(join(root, p))) {
          violations.push(
            `${rel}: declares "${p}" as implementing code, and that path does not exist. ` +
              `The implementation moved or was deleted, and the ADR still claims it.`,
          );
        }
      }
    }

    // EN/ES parity of the declaration: a reader of either language must get the
    // same answer. Only checked from the Spanish side, so it runs exactly once.
    const en = englishSibling(rel);
    if (en && parsed.has(en)) {
      const enAdr = parsed.get(en);
      if ((enAdr.directive ?? '').toLowerCase() !== adr.directive.toLowerCase()) {
        violations.push(
          `${rel}: implementation-status is "${adr.directive}" but ${en} declares ` +
            `"${enAdr.directive ?? '(none declared)'}". The two languages must state the same thing.`,
        );
      }
    }
  }

  // A baseline that cannot shrink is decoration. Both directions are checked.
  for (const rel of baseline.undeclared) {
    if (!files.includes(rel)) {
      violations.push(`baseline lists "${rel}" under undeclared, and no such ADR exists. Remove the stale entry.`);
    } else if (!undeclared.includes(rel)) {
      violations.push(
        `baseline still lists "${rel}" under undeclared, but it now declares an implementation status. ` +
          `Remove the entry so the backlog reflects reality.`,
      );
    }
  }
  for (const rel of baseline.unparseableStatus) {
    if (!files.includes(rel)) {
      violations.push(`baseline lists "${rel}" under unparseableStatus, and no such ADR exists. Remove the stale entry.`);
    } else if (!unparseable.includes(rel)) {
      violations.push(
        `baseline still lists "${rel}" under unparseableStatus, but its status now parses. Remove the entry.`,
      );
    }
  }

  if (opts.strict) {
    for (const rel of undeclared) {
      violations.push(`--strict: ${rel} is Accepted and still undeclared.`);
    }
    for (const rel of unparseable) {
      violations.push(`--strict: ${rel} still has no parseable status.`);
    }
  }

  return { violations, scanned: files.length, undeclared, unparseable, declared, none };
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (n) => args.includes(n);
  const val = (n) => {
    const i = args.indexOf(n);
    return i === -1 ? undefined : args[i + 1];
  };

  const root = resolve(val('--root') ?? join(__dirname, '..', '..', '..'));
  const baselineFile = val('--baseline') ? resolve(val('--baseline')) : BASELINE_FILE;
  const writeBaseline = flag('--write-baseline');
  const result = evaluate({
    root,
    baselineFile,
    strict: flag('--strict'),
    verbose: flag('--verbose'),
    writeBaseline,
  });

  if (writeBaseline) {
    const payload = {
      _comment:
        'GT-607 baseline: ADRs that predate the implementation-status convention. This list must only shrink; ' +
        'the guard fails when an entry is stale. New and modified ADRs are not eligible for it.',
      generated: new Date().toISOString().slice(0, 10),
      undeclared: result.undeclared,
      unparseableStatus: result.unparseable,
    };
    writeFileSync(baselineFile, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `✓ baseline written: ${result.undeclared.length} undeclared, ${result.unparseable.length} unparseable, of ${result.scanned} ADRs.`,
    );
    return 0;
  }

  if (flag('--verbose')) {
    for (const rel of result.undeclared) console.log(`  baselined (undeclared): ${rel}`);
    for (const rel of result.unparseable) console.log(`  baselined (no status):  ${rel}`);
  }

  if (result.violations.length > 0) {
    console.error(`✗ ${GUARD}: ${result.violations.length} violation(s) of ${result.scanned} ADR(s) scanned:\n`);
    for (const v of result.violations) console.error('  - ' + v);
    return 1;
  }

  console.log(
    `✓ ${GUARD}: ${result.scanned} ADR(s) scanned — ${result.declared} declare an implementation status ` +
      `(${result.none} of them "none"); ${result.undeclared.length} undeclared and ${result.unparseable.length} ` +
      `without a parseable status remain baselined.`,
  );
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv));
}
