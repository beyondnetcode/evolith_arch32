/**
 * GT-699 — a finding must say whether it is a VERDICT about the repository or an
 * admission that the rule could not be evaluated.
 *
 * MEASURED ON THIS REPOSITORY, 2026-08-16, through the shipped CLI:
 * `evolith validate` reports **82 blocking issues**, of which **74** are in
 * `blockingSkippedRuleIds` — they say "This rule is declared `blocking: true` and
 * was NOT evaluated". Only **8** are verdicts about the code. And an issue of each
 * kind is INDISTINGUISHABLE: same fields, same `severity: MUST`, same
 * `blocking: true`. A reader sees 82 problems and has 8.
 *
 * This is not `GT-595` being wrong — that criterion exists precisely so a blocking
 * rule that skips is not silently green, and it must keep firing. The defect is one
 * level up: the run publishes the partition in its counters
 * (`blockingSkippedRuleIds`, `rulesNonExecutable`, `notApplicableRuleIds`) and then
 * flattens it away in `issues[]`, which is the array a human and a Tracker actually
 * read.
 *
 * The same distinction this codebase already made for rules in `GT-696`
 * (`observed` / `declared` / `unevaluated`) applied to findings.
 */

import { blockingSkippedIssue } from './rule-evaluation-engine';

describe('a finding declares whether it is a verdict or an admission · GT-699', () => {
  const skipped = (over: Record<string, unknown> = {}) =>
    blockingSkippedIssue({
      rule: {
        id: 'ACL-02',
        severity: 'MUST',
        category: 'anti-corruption',
        title: 'Transformation Traceability',
        blocking: true,
      },
      message: 'No acl/ directory found — rule not applicable',
      ...over,
    } as never);

  it('an unevaluated blocking rule is marked as NOT a verdict about the repository', () => {
    const issue = skipped();

    // The field a consumer needs in order to count violations without counting
    // "we could not check this" as one of them.
    expect(issue.evaluated).toBe(false);
  });

  it('still reports it as blocking — GT-595 must keep firing', () => {
    // A blocking rule that skips must not become invisible. The point of the new
    // field is to make it LEGIBLE, never to suppress it.
    expect(skipped().blocking).toBe(true);
    expect(skipped().severity).toBe('MUST');
  });

  it('carries WHY it could not be evaluated, so the remedy is not guesswork', () => {
    expect(skipped().description).toMatch(/was NOT evaluated/);
  });
});
