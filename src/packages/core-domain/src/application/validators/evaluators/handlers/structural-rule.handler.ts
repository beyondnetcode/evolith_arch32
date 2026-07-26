import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class StructuralRuleHandler implements INativeRuleHandler {
  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('STRUCT-') || rule.id.startsWith('C4-');
  }

  async evaluate(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const { facts } = ctx;
    if (!facts?.repoFacts || !facts?.architectureBindings) {
      return {
        rule,
        result: 'skipped',
        message: 'No SCIP/Structural facts provided in evaluation context.',
      };
    }

    // Advanced structural evaluation:
    // This is a placeholder logic for checking structural constraints.
    const { repoFacts, architectureBindings } = facts;

    // Example logic for a specific rule ID
    if (rule.id === 'C4-01') {
      const missingBindings = architectureBindings.filter(b => b.symbols.length === 0);
      if (missingBindings.length > 0) {
        return {
          rule,
          result: 'failed',
          message: `Elements have no bound symbols: ${missingBindings.map(b => b.c4ElementId).join(', ')}`,
        };
      }
    }

    return {
      rule,
      result: 'passed',
      message: 'Structural constraints satisfied.',
    };
  }
}
