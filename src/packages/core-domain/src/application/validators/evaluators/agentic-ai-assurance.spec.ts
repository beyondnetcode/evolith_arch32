/**
 * GT-683 AC4 — every `AAI-*` rule states whether its verdict was OBSERVED or merely
 * DECLARED, and the label has to be true.
 *
 * The gap this closes: nine blocking rules were decided entirely by reading one
 * self-declared JSON, and nothing in the shipped output said so. A buyer reading a
 * green `AAI-R02` could not tell "we inspected the sandbox" from "the repository
 * told us it has one". Those are different claims and only one of them is worth
 * paying for.
 *
 * The label is not editorial. It is checked against what the handler DOES: a rule
 * whose case never touches the filesystem may not call itself `observed`. Derived
 * from the handler source rather than from a second hand-kept list, because a list
 * that can disagree with the code is the defect one level up.
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const RULES = path.resolve(__dirname, '../../../../../../rulesets/topologies/agentic-ai/agentic-ai.rules.json');
const HANDLER = path.resolve(__dirname, 'handlers/architecture/agent-rules.ts');

/** The primitives that make a verdict an observation rather than a field read. */
const OBSERVATION_PRIMITIVES =
  /declaredDirectoryIsPopulated|declaredFileHasContent|findDeclaredBoundaryBreaches|resolveDeclaredPath/;

type Rule = { id: string; category: string; assurance?: string; blocking?: boolean; severity?: string };

const rules = (): Rule[] =>
  (JSON.parse(readFileSync(RULES, 'utf8')) as { rules: Rule[] }).rules;

/** category → does its handler branch reach the filesystem at all? */
function observedCategories(): Set<string> {
  const source = readFileSync(HANDLER, 'utf8');
  const out = new Set<string>();
  const branches = source.split(/case '/).slice(1);
  for (const branch of branches) {
    const category = branch.slice(0, branch.indexOf("'"));
    const nextCase = branch.indexOf("\n    case ");
    const body = nextCase > 0 ? branch.slice(0, nextCase) : branch;
    if (OBSERVATION_PRIMITIVES.test(body)) out.add(category);
  }
  return out;
}

describe('every AAI rule declares a truthful assurance · GT-683 AC4', () => {
  it('reads the real ruleset and the real handler, so an empty scan cannot pass this vacuously', () => {
    expect(rules().length).toBeGreaterThanOrEqual(10);
    expect(observedCategories().size).toBeGreaterThan(0);
  });

  it('EVERY rule carries an assurance — silence is what the gap was', () => {
    const missing = rules().filter((r) => r.assurance !== 'observed' && r.assurance !== 'declared');
    expect(missing.map((r) => `${r.id}:${r.assurance ?? '<absent>'}`)).toEqual([]);
  });

  it('a rule may not claim `observed` while its handler only compares fields', () => {
    const observed = observedCategories();
    const lying = rules()
      .filter((r) => r.assurance === 'observed' && !observed.has(r.category))
      .map((r) => `${r.id} (${r.category})`);

    expect(lying).toEqual([]);
  });

  it('…and a rule that DOES observe may not undersell itself as `declared`', () => {
    const observed = observedCategories();
    const modest = rules()
      .filter((r) => r.assurance === 'declared' && observed.has(r.category))
      .map((r) => `${r.id} (${r.category})`);

    // Both directions matter: an over-claim misleads a buyer, an under-claim hides
    // work we did and makes the corpus look weaker than it is.
    expect(modest).toEqual([]);
  });

  it('an auditor can partition the corpus from the JSON alone', () => {
    const byAssurance = rules().reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.assurance ?? '<absent>'] ??= []).push(r.id);
      return acc;
    }, {});

    // Pinned, so a rule quietly changing sides shows up here. AAI-R03 and AAI-R08
    // moved to `observed` in this same gap; AAI-R10 was born observed.
    expect(byAssurance.observed?.sort()).toEqual(['AAI-R03', 'AAI-R08', 'AAI-R10']);
    expect(byAssurance.declared?.length).toBe(7);
  });
});
