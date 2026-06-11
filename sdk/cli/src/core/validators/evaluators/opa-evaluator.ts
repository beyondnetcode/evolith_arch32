import * as path from 'path';
import { IFileSystem, ILogger } from '../../abstractions';
import { NormalizedRule } from '../rule-evaluation-engine';
import { IRuleEvaluatorStrategy, EvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { loadPolicy } from '@open-policy-agent/opa-wasm';

export class OpaEvaluator implements IRuleEvaluatorStrategy {
  private policyCache: any = null;

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {}

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
      const input = await this.buildOpaInput(ctx);
      
      // Evaluate against the OPA policy
      // Assuming the policy is structured to return a set of violations under data.evolith.violations
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

  /**
   * Reads necessary physical files to build a rich JSON input for OPA.
   * OPA needs JSON to evaluate, so we must feed it the `package.json`, etc.
   */
  private async buildOpaInput(ctx: EvaluationContext): Promise<any> {
    const input: any = {
      satellitePath: ctx.satellitePath,
      corePath: ctx.corePath,
      satellite: {
        packageJson: await this.safeReadJson(path.join(ctx.satellitePath, 'package.json')),
      },
      core: {
        packageJson: await this.safeReadJson(path.join(ctx.corePath, 'package.json')),
      }
    };
    return input;
  }

  private async safeReadJson(filePath: string): Promise<any> {
    if (await this.fs.exists(filePath)) {
      try {
        return await this.fs.readJson(filePath);
      } catch {
        return null;
      }
    }
    return null;
  }
}
