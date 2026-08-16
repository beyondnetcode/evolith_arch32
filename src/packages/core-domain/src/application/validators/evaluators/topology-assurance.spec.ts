/**
 * GT-696 — the assurance vocabulary, extended to the four config-driven topologies
 * and to the state `GT-683`'s binary could not express.
 *
 * `GT-683` gave agentic-ai two labels: `observed` (the evaluation opened the
 * repository) and `declared` (a field in a declaration file was compared). This
 * row's criterion asked for the same binary here, with "no topology left in a third
 * state".
 *
 * THAT BINARY IS WRONG FOR THESE FOUR AND THE CRITERION IS REWRITTEN RATHER THAN
 * FORCED — the same correction `GT-694`'s AC2 needed. Ten of the 29 rules are
 * decided by NOTHING: no handler branch claims their category, and the corpus
 * triage already classifies them `underspecified`, `unimplemented-native` or
 * `needs-external-system`. Calling those `declared` would be a third falsehood on
 * top of the two this family has already fixed: they are not believed, they are not
 * checked, they are not evaluated. `unevaluated` says so.
 *
 * Every label is DERIVED from the code that decides the rule, never hand-listed:
 *   observed    — the handler branch reaches the filesystem
 *   declared    — the category is in CONFIG_CATEGORIES, or the id is in
 *                 TOPOLOGY_FLAG_RULES (a field read, keyed by id rather than
 *                 category because two bare categories are shared across topologies
 *                 with different files and different flags)
 *   unevaluated — nothing claims it
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const TOPOLOGIES = ['serverless', 'event-driven', 'data-mesh', 'edge-computing'] as const;
const ROOT = path.resolve(__dirname, '../../../../../../rulesets/topologies');
const HANDLERS = path.resolve(__dirname, 'handlers/architecture');

const FS_PRIMITIVES = /fs\.exists|readFile\(|readdirNames|listFiles|declaredDirectoryIsPopulated|declaredFileHasContent/;
const ASSURANCES = ['observed', 'declared', 'unevaluated'];

type Rule = { id: string; category: string; assurance?: string };

const rulesOf = (topology: string): Rule[] =>
  (JSON.parse(readFileSync(path.join(ROOT, topology, `${topology}.rules.json`), 'utf8')) as { rules: Rule[] }).rules;

const configSource = () => readFileSync(path.join(HANDLERS, 'config-rules.ts'), 'utf8');

/** Categories whose deciding branch reaches disk, read from every handler file. */
function observedCategories(): Set<string> {
  const out = new Set<string>();
  for (const file of ['structural-rules.ts', 'config-rules.ts', 'agent-rules.ts']) {
    let source: string;
    try { source = readFileSync(path.join(HANDLERS, file), 'utf8'); } catch { continue; }
    for (const match of source.matchAll(/case '([a-z-]+)'/g)) {
      const start = source.indexOf(`case '${match[1]}'`);
      const next = source.indexOf('\n    case ', start + 5);
      if (FS_PRIMITIVES.test(source.slice(start, next > 0 ? next : start + 900))) out.add(match[1]);
    }
  }
  return out;
}

/** Categories decided by comparing a field in a declaration file. */
function declaredCategories(): Set<string> {
  const source = configSource();
  const block = source.slice(source.indexOf('CONFIG_CATEGORIES'), source.indexOf(']);', source.indexOf('CONFIG_CATEGORIES')));
  return new Set([...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));
}

/** Rules decided by a field read keyed on the ID rather than the category. */
function flagRuleIds(): Set<string> {
  return new Set([...configSource().matchAll(/'([A-Z]+-R\d+)':\s*\{ file:/g)].map((m) => m[1]));
}

function expectedAssurance(rule: Rule, observed: Set<string>, declared: Set<string>, flags: Set<string>): string {
  if (observed.has(rule.category)) return 'observed';
  if (declared.has(rule.category) || flags.has(rule.id)) return 'declared';
  return 'unevaluated';
}

describe('every topology rule declares a truthful assurance · GT-696', () => {
  it('reads the real rulesets and the real handlers, so an empty scan cannot pass this vacuously', () => {
    expect(TOPOLOGIES.flatMap(rulesOf).length).toBeGreaterThanOrEqual(25);
    expect(declaredCategories().size).toBeGreaterThanOrEqual(10);
    expect(flagRuleIds().size).toBeGreaterThan(0);
  });

  it('EVERY rule carries one of the three assurances', () => {
    const bad = TOPOLOGIES.flatMap((t) =>
      rulesOf(t).filter((r) => !ASSURANCES.includes(r.assurance ?? '')).map((r) => `${t}/${r.id}:${r.assurance ?? '<absent>'}`),
    );
    expect(bad).toEqual([]);
  });

  it('every label matches what the code that decides the rule actually does', () => {
    const observed = observedCategories();
    const declared = declaredCategories();
    const flags = flagRuleIds();
    const wrong = TOPOLOGIES.flatMap((t) =>
      rulesOf(t)
        .filter((r) => r.assurance !== expectedAssurance(r, observed, declared, flags))
        .map((r) => `${t}/${r.id}: labelled ${r.assurance}, code says ${expectedAssurance(r, observed, declared, flags)}`),
    );
    expect(wrong).toEqual([]);
  });

  it('pins the split, so a rule quietly changing hands shows up here', () => {
    const tally = TOPOLOGIES.flatMap(rulesOf).reduce<Record<string, number>>((acc, r) => {
      acc[r.assurance!] = (acc[r.assurance!] ?? 0) + 1;
      return acc;
    }, {});

    // Moving one from `declared` to `observed` is progress; moving one to
    // `unevaluated` means an implementation was lost and must be argued.
    expect(tally).toEqual({ observed: 2, declared: 17, unevaluated: 10 });
  });

  it('`unevaluated` is not a euphemism — none of those rules has a deciding branch', () => {
    const observed = observedCategories();
    const declared = declaredCategories();
    const flags = flagRuleIds();
    const claimed = TOPOLOGIES.flatMap((t) =>
      rulesOf(t)
        .filter((r) => r.assurance === 'unevaluated')
        .filter((r) => observed.has(r.category) || declared.has(r.category) || flags.has(r.id))
        .map((r) => `${t}/${r.id}`),
    );
    expect(claimed).toEqual([]);
  });
});
