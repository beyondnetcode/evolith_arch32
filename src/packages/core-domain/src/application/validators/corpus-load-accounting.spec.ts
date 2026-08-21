/**
 * #575 — a `*.rules.json` the loader turns into no rules must reach the report.
 *
 * The loader globs `*.rules.json` and some matches are not rule SETS. Before this,
 * the only trace was a log line: it does not survive `--format json`, it never
 * reaches an exit code, and the document vanished out of every denominator the
 * report published. That is the silent drop this project exists to stop, happening
 * inside its own loader.
 *
 * These tests are about the two outcomes being weighted DIFFERENTLY. A document
 * that declares a non-ruleset schema and satisfies it contributes no rules by
 * design and must not fail a run. A document that claims to be a ruleset and is
 * not must fail one — otherwise it is indistinguishable, in every number
 * downstream, from a file that was never there.
 */

import { RulesetValidatorService } from './ruleset-validator.service';
import type { CorpusDocumentOutcome } from '../../domain/ports/ruleset-repository.port';

type Issue = { ruleId: string; blocking: boolean; severity: string; description: string };

/** Reaches the private method under test without re-running a whole validation. */
function issuesFor(outcomes: readonly CorpusDocumentOutcome[]): Issue[] {
  const service = Object.create(RulesetValidatorService.prototype) as Record<string, unknown>;
  service.rulesetRepo = { describeLastLoad: () => outcomes };
  return (service as unknown as { corpusLoadIssues(): Issue[] }).corpusLoadIssues();
}

const classified: CorpusDocumentOutcome = {
  file: 'infrastructure/helm-enforcement.rules.json',
  outcome: 'classified',
  declaredSchema: 'rule-definition.schema.json',
  detail: 'a single rule declaration, enforced by its paired CI guard and Rego policy',
};

const rejected: CorpusDocumentOutcome = {
  file: 'architecture/broken.rules.json',
  outcome: 'rejected',
  detail: "Schema validation failed: data must have required property 'rules'",
};

describe('corpus load accounting (#575)', () => {
  it('says nothing when the whole corpus loaded', () => {
    expect(issuesFor([])).toEqual([]);
  });

  it('reports a classified document without failing the run', () => {
    const [issue, ...rest] = issuesFor([classified]);

    expect(rest).toEqual([]);
    expect(issue.ruleId).toBe('GOV-CORPUS-NOT-A-RULESET');
    expect(issue.blocking).toBe(false);
    expect(issue.severity).toBe('COULD');
    // The file has to be NAMED, or the row is a count the reader cannot act on.
    expect(issue.description).toContain('infrastructure/helm-enforcement.rules.json');
    expect(issue.description).toContain('paired CI guard');
  });

  it('fails the run for a document that claims to be a ruleset and is not', () => {
    const [issue, ...rest] = issuesFor([rejected]);

    expect(rest).toEqual([]);
    expect(issue.ruleId).toBe('GOV-CORPUS-REJECTED');
    expect(issue.blocking).toBe(true);
    expect(issue.severity).toBe('MUST');
    expect(issue.description).toContain('architecture/broken.rules.json');
    expect(issue.description).toContain("must have required property 'rules'");
  });

  it('keeps the two outcomes apart when both occur', () => {
    const issues = issuesFor([classified, rejected]);

    expect(issues.map(i => i.ruleId)).toEqual(['GOV-CORPUS-NOT-A-RULESET', 'GOV-CORPUS-REJECTED']);
    // The classified one must not be dragged into blocking by its neighbour.
    expect(issues.map(i => i.blocking)).toEqual([false, true]);
  });

  it('stays silent for a repository that cannot describe its load', () => {
    const service = Object.create(RulesetValidatorService.prototype) as Record<string, unknown>;
    service.rulesetRepo = { loadAllRulesets: async () => [] };

    expect((service as unknown as { corpusLoadIssues(): Issue[] }).corpusLoadIssues()).toEqual([]);
  });
});
