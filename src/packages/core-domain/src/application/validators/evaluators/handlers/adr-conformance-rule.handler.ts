import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';
import { ADR_CONFORMANCE_CATEGORY, hasNoAuthoredCheck } from '../../rule-evaluability';

/**
 * GT-595 — the largest single class of unevaluated rules, handled honestly.
 *
 * `.harness/scripts/generate-adr-rulesets.mjs` emits one conformance rule per
 * ADR: 126 of them, 91 `blocking: true`, every one carrying a validationQuery
 * that ends "Concrete checks to be wired into the harness." They were 126 of the
 * 240 rules no handler claimed — more than half the coverage hole — and no
 * amount of handler-writing closes them, because there is nothing in the rule to
 * evaluate. The rule text says so itself.
 *
 * The tempting fix is a handler that returns `passed` when the ADR exists. That
 * would be the false green this backlog is about: "conform to the decision
 * recorded in ADR-0111" is not satisfied by ADR-0111 being on disk.
 *
 * So this handler evaluates only what is genuinely decidable, and says exactly
 * what it did:
 *  - the ruleset cites its decision record in `references[]`; if that document
 *    is gone the rule governs nothing and the ruleset is stale ⇒ `failed`;
 *  - otherwise the rule is reported `skipped` and CLASSIFIED, so the engine can
 *    stop counting an unwireable rule as coverage debt (`documentation-only`)
 *    while an ADR rule someone HAS since given a real query stays in the
 *    denominator (`unimplemented-native`).
 */
export class AdrConformanceRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.category === ADR_CONFORMANCE_CATEGORY;
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const missing = await this.missingDecisionRecords(rule, ctx);

    if (missing.length > 0) {
      return {
        rule,
        result: 'failed',
        message:
          `The ruleset cites ${missing.length} decision record(s) that do not exist: ${missing.join(', ')}. ` +
          'A conformance rule whose ADR has been moved or deleted governs nothing — regenerate or retire the ruleset.',
      };
    }

    if (hasNoAuthoredCheck(rule.validationQuery)) {
      return {
        rule,
        result: 'skipped',
        evaluability: 'documentation-only',
        message:
          'Auto-generated ADR-conformance rule: its validationQuery is the generator placeholder ' +
          '("concrete checks to be wired into the harness"), so no check was ever authored. ' +
          'The cited decision record exists. This rule is documentation, not an executable gate — ' +
          'it is excluded from the executable coverage denominator and cannot block.',
      };
    }

    return {
      rule,
      result: 'skipped',
      evaluability: 'unimplemented-native',
      message:
        'ADR-conformance rule with an authored validationQuery but no native handler yet. ' +
        'It stays in the executable denominator: this is real coverage debt.',
    };
  }

  /**
   * Read the ruleset the rule came from and check its `references[]` resolve.
   *
   * Deliberately tolerant: `sourceFile` is corpus-relative, and a host may
   * evaluate a corpus it did not load from `corePath`. If the ruleset cannot be
   * read or declares no references, there is simply nothing to verify — return
   * no findings rather than inventing a failure or throwing (which GT-569 would
   * correctly report as `errored` for 126 rules at once).
   */
  private async missingDecisionRecords(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<string[]> {
    let parsed: unknown;
    try {
      const raw = await this.fs.readFile(path.join(ctx.corePath, rule.sourceFile));
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    const references = (parsed as { references?: unknown })?.references;
    if (!Array.isArray(references)) return [];

    const missing: string[] = [];
    for (const ref of references) {
      if (typeof ref !== 'string' || ref.trim().length === 0) continue;
      if (!(await this.fs.exists(path.join(ctx.corePath, ref)))) missing.push(ref);
    }
    return missing;
  }
}
