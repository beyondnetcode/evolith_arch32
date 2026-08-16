/**
 * GT-312: Ruleset Validation Mode
 * Validates specific rulesets independently.
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';

const RULESET_ID_MAP: Record<string, string> = {
  'acl': 'rulesets/acl/anti-corruption-layer.rules.json',
  'open-core': 'rulesets/governance/open-core-boundary.rules.json',
  'inheritance': 'rulesets/governance/inheritance.rules.json',
  'satellite-contracts': 'rulesets/governance/satellite-contracts.rules.json',
  'executive-scorecards': 'rulesets/governance/executive-scorecards.rules.json',
  'cli-release': 'rulesets/cli/release-readiness.rules.json',
  'cli-parity': 'rulesets/cli/core-parity.rules.json',
  'evidence': 'rulesets/evidence/evidence-manifest.rules.json',
  'mcp': 'rulesets/mcp/protocol-compliance.rules.json',
  'observability': 'rulesets/observability/telemetry-evidence.rules.json',
  'compliance-baseline': 'rulesets/cross-cutting/compliance-baseline.rules.json',
  'definition-of-done': 'rulesets/cross-cutting/definition-of-done.rules.json',
  'engineering-manifesto': 'rulesets/cross-cutting/engineering-manifesto.rules.json',
  'repository-taxonomy': 'rulesets/cross-cutting/repository-taxonomy.rules.json',
  'phase-gates': 'rulesets/sdlc/phase-gates.rules.json',
  'quality-thresholds': 'rulesets/sdlc/quality-thresholds.rules.json',
  'dependency-pinning': 'rulesets/sdlc/dependency-pinning.rules.json',
};

export class RulesetValidationMode implements ValidationMode {
  readonly name = 'ruleset' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.rulesetId);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const rulesetId = context.rulesetId!;
      const rulesetPath = RULESET_ID_MAP[rulesetId];

      if (!rulesetPath) {
        return {
          mode: 'ruleset',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'RULESET_NOT_FOUND',
            status: 'fail',
            message: `Ruleset '${rulesetId}' not found. Supported: ${Object.keys(RULESET_ID_MAP).join(', ')}`,
            severity: 'error',
            remediation: `Create ruleset with ID '${rulesetId}'`,
          }],
        };
      }

      const fullRulesetPath = path.join(
        context.corePath || context.satellitePath,
        rulesetPath,
      );

      let rulesetContent: string;
      try {
        rulesetContent = await fs.readFile(fullRulesetPath, 'utf-8');
      } catch {
        return {
          mode: 'ruleset',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'RULESET_FILE_NOT_FOUND',
            status: 'fail',
            message: `Ruleset file not found: ${rulesetPath}`,
            severity: 'error',
            remediation: `Create ruleset file at ${rulesetPath}`,
          }],
        };
      }

      const ruleset = JSON.parse(rulesetContent);
      const rules: Array<{ id?: string; title?: string }> = ruleset.rules || [];
      const ruleIds = rules.map((rule, index) => rule.id || `RULESET-${rulesetId}-${index}`);

      // GT-701 — parsing is not checking.
      //
      // This loop used to push `status: 'pass'` with "Rule '<id>' loaded and
      // registered" for every rule it could read, and the mode returned
      // `passed`. Measured on this repository the day it was fixed: the same
      // satellite that `evolith validate` reported as FAILED with 112 issues came
      // back from `evolith validate --composable --ruleset definition-of-done` as
      // PASSED with "10 rules checked" — ten rules that were parsed and never
      // evaluated. `--engine opa` produced byte-identical output, because no
      // engine was involved on either run.
      if (!context.evaluator) {
        return this.refuse(rulesetId, ruleIds);
      }
      return await this.evaluate(context, rulesetId, rulesetPath, ruleIds);
    } catch (error) {
      issues.push({
        ruleId: 'RULESET_VALIDATION_ERROR',
        status: 'fail',
        message: `Ruleset validation error: ${(error as Error).message}`,
        severity: 'error',
      });
    }

    // Only reachable when the `try` threw: every other path returns above.
    return {
      mode: 'ruleset',
      status: 'failed',
      rulesChecked: 0,
      issues,
      metadata: {
        rulesetId: context.rulesetId,
        evaluated: false,
      },
    };
  }

  /**
   * GT-701 — no evaluator, so no verdict.
   *
   * The rules are reported SKIPPED and named, never `pass`. `status: 'failed'` is
   * deliberate and is GT-595 AC2 applied to this surface: a run that could not
   * check its blocking rules must not be readable as green. A caller that wants a
   * green light has to supply an evaluator.
   */
  private refuse(rulesetId: string, ruleIds: string[]): ModeValidationResult {
    return {
      mode: 'ruleset',
      status: 'failed',
      rulesChecked: 0,
      rulesSkipped: ruleIds.length,
      rulesErrored: 0,
      rulesTotal: ruleIds.length,
      skippedRuleIds: ruleIds,
      issues: [{
        ruleId: 'RULESET_NOT_EVALUATED',
        status: 'fail',
        severity: 'error',
        message:
          `Ruleset '${rulesetId}' was parsed (${ruleIds.length} rule(s)) but no evaluator was ` +
          'supplied to the composable context, so not one of them was checked. Refusing rather ' +
          'than reporting them as passing.',
        remediation:
          'Pass `evaluator` on the ValidationContext — a RulesetValidatorService built for the ' +
          'requested engine satisfies it as-is.',
      }],
      metadata: { rulesetId, evaluated: false },
    };
  }

  /**
   * GT-701 — delegate to the engine the caller asked for.
   *
   * The selection ref is the corpus-relative path from {@link RULESET_ID_MAP},
   * which `ruleMatchesRef` normalises (it strips a leading `rulesets/`) and
   * matches against a rule's `sourceFile` on whole path segments.
   */
  private async evaluate(
    context: ValidationContext,
    rulesetId: string,
    rulesetPath: string,
    ruleIds: string[],
  ): Promise<ModeValidationResult> {
    const outcome = await context.evaluator!.validate(
      context.satellitePath,
      context.corePath,
      { rulesetRef: rulesetPath },
    );

    const issues: ModeValidationIssue[] = outcome.issues.map((finding) => ({
      ruleId: finding.ruleId,
      // GT-595 AC2, and it survived one wrong version of this line: an
      // unevaluated BLOCKING rule can never read as green. Measured before the
      // correction — `--composable --ruleset definition-of-done` came back
      // `passed` while reporting "Blocking rule did not run" for DOD-02 and
      // DOD-08, because the admission had been softened to a warning.
      //
      // `evaluated` decides which COUNTER a rule lands in (checked or skipped),
      // never whether the run may be called green. That is GT-699's partition
      // and its docblock says so explicitly.
      status: finding.blocking ? 'fail' : 'warn',
      message: finding.description ? `${finding.title} — ${finding.description}` : finding.title,
      severity: finding.blocking ? 'error' : finding.severity === 'COULD' ? 'info' : 'warning',
      file: finding.file,
    }));

    // A `pass` is emitted ONLY for a rule this ruleset declares that the engine
    // actually evaluated and had nothing to say about. Rules the engine skipped
    // or errored on are excluded by name, not by arithmetic.
    const accountedFor = new Set<string>([
      ...outcome.issues.map((finding) => finding.ruleId),
      ...(outcome.skippedRuleIds ?? []),
      ...(outcome.erroredRuleIds ?? []),
    ]);
    const cleared = ruleIds.filter((id) => !accountedFor.has(id));
    for (const ruleId of cleared) {
      issues.push({
        ruleId,
        status: 'pass',
        severity: 'info',
        message: `Rule '${ruleId}' evaluated by the ${context.engine} engine with no finding`,
      });
    }

    // The DENOMINATOR comes from the engine, not from this file.
    //
    // Deriving it here was wrong and measurable: `definition-of-done` declares 10
    // rules in its JSON, and the engine's own accounting for the same selection
    // came back 8 checked + 4 skipped = 12, because a ref selects by `sourceFile`
    // across the normalised corpus and not by what one document happens to list.
    // Publishing 10 as the total next to the engine's counts produced an
    // arithmetic that did not add up — the class of number this whole row exists
    // to stop. `acl` is the same case from the other side: no `rules[]` at all,
    // and the engine still had two findings to report.
    //
    // GT-699 is applied on the way in: a finding the engine could not evaluate is
    // an admission, so its rule is skipped, never checked.
    const admitted = outcome.issues
      .filter((finding) => finding.evaluated === false)
      .map((finding) => finding.ruleId);
    const engineSkipped = outcome.skippedRuleIds ?? [];
    const skippedRuleIds = [...new Set([...engineSkipped, ...admitted])];
    const rulesChecked = Math.max(0, outcome.rulesChecked - admitted.filter((id) => !engineSkipped.includes(id)).length);

    return {
      mode: 'ruleset',
      status: issues.some((issue) => issue.status === 'fail')
        ? 'failed'
        : issues.some((issue) => issue.status === 'warn')
          ? 'warning'
          : 'passed',
      rulesChecked,
      rulesSkipped: skippedRuleIds.length,
      rulesErrored: outcome.rulesErrored ?? (outcome.erroredRuleIds ?? []).length,
      rulesTotal: outcome.rulesTotal ?? (rulesChecked + skippedRuleIds.length),
      skippedRuleIds,
      erroredRuleIds: outcome.erroredRuleIds ?? [],
      issues,
      metadata: { rulesetId, evaluated: true, engine: context.engine },
    };
  }
}
