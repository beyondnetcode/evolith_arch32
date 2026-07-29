/**
 * ModuleBoundaryRuleHandler (GT-632).
 *
 * Claims the rules that author a module-graph boundary in their own `enforce.config`
 * — today HXA-01, HXA-02, HXA-04 and HXA-05, all four `blocking: true` and all four
 * reporting `skipped` until now.
 *
 * It claims by CLAUSE, not by rule id. Every other architecture handler in this
 * directory dispatches on `rule.category` and then hard-codes the rule id it knows
 * (`if (rule.id !== 'MM-R11') return PASSED`), which is why a rule could carry a
 * complete, machine-readable check and still have nothing execute it. Here the
 * authored clause is the program, so a new boundary rule needs no code at all.
 *
 * The category gate ({@link BOUNDARY_RULE_CATEGORIES}) is deliberate and shared with
 * the PolicyCompiler: a clause is only sufficient evidence for a verdict when the
 * rule's whole assertion IS the boundary. HXA-07 carries a from/to clause but asserts
 * a timing budget as well, so it stays unclaimed rather than being passed on half a
 * check.
 */

import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';
import { BOUNDARY_RULE_CATEGORIES } from '../../enforcement/policy-compiler';
import {
  compileModuleBoundaryCheck,
  evaluateModuleBoundaryRule,
  isUnsupportedClause,
} from './architecture/module-boundary-rules';

export class ModuleBoundaryRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    if (!BOUNDARY_RULE_CATEGORIES.has(rule.category)) return false;
    // Claim only what can actually be decided. A rule in a boundary category with
    // no lowerable clause (HXA-06) is left to fall through to the classifier, which
    // reports it as handler backlog — claiming it would convert honest backlog into
    // an unattributed skip.
    return !isUnsupportedClause(compileModuleBoundaryCheck(rule));
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const sub = await evaluateModuleBoundaryRule(rule, ctx, this.fs);
    return { rule, result: sub.result, message: sub.message };
  }
}
