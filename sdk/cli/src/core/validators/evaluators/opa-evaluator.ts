import * as path from 'path';
import { IFileSystem, ILogger } from '../../abstractions';
import { NormalizedRule } from '../rule-evaluation-engine';
import { IRuleEvaluatorStrategy, EvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { loadPolicy } from '@open-policy-agent/opa-wasm';
import { OpaInputBuilder } from './opa-input-builder';

export class OpaEvaluator implements IRuleEvaluatorStrategy {
  private policyCache: any = null;
  private inputBuilder: OpaInputBuilder;

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {
    this.inputBuilder = new OpaInputBuilder(fs);
  }

  async evaluateAll(
    rules: NormalizedRule[],
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult[]> {
    const wasmPath = path.join(ctx.corePath, 'rulesets', 'opa', 'policy.wasm');
    if (!await this.fs.exists(wasmPath)) {
      this.logger.warn(`OPA WebAssembly policy not found at ${wasmPath}. Please compile the .rego rules.`);
      return rules.map(rule => ({
        rule,
        result: 'skipped',
        message: 'OPA Wasm policy not compiled yet.',
      }));
    }

    try {
      if (!this.policyCache) {
        const wasmBuffer = await this.fs.readFileBuffer(wasmPath);
        this.policyCache = await loadPolicy(wasmBuffer);
      }

      // Build the input for OPA
      const input = await this.inputBuilder.build(ctx);
      
      // Evaluate against the OPA policy
      const resultSet = this.policyCache.evaluate(input);
      
      const violations = resultSet && resultSet.length > 0 && resultSet[0].result ? resultSet[0].result : [];
      
      return rules.map(rule => {
        const ruleViolations = violations.filter((v: any) => v.id === rule.id);
        if (ruleViolations.length > 0) {
          return {
            rule,
            result: 'failed',
            message: ruleViolations.map((v: any) => v.message).join('; '),
          };
        }
        return {
          rule,
          result: 'passed'
        };
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to evaluate OPA policy: ${msg}`);
      return rules.map(rule => ({
        rule,
        result: 'skipped',
        message: `OPA Engine Error: ${msg}`
      }));
    }
  }
}
