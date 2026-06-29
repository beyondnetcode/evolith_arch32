import * as path from 'path';
import { IFileSystem, ILogger } from '../../../domain/interfaces';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { loadPolicy } from '@open-policy-agent/opa-wasm';
import { OpaInputBuilder } from './opa-input-builder';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * GT-382: context-aware policies emit namespaced violation ids (`DOD-*`, `CB-*`,
 * `PG-*`) that can never equal the path-derived rule id produced for a gate's
 * `rules: ["rulesets/opa/<file>.rego"]` reference (e.g. `deriveRuleId` →
 * `opa-dod`). For these policies a gate rule referencing the policy file owns
 * ALL of that policy's violations, so they are matched by id PREFIX. Every other
 * rule keeps exact-id matching, so this changes no other policy's behavior.
 */
const CONTEXT_AWARE_VIOLATION_PREFIXES: Readonly<Record<string, string>> = {
  'opa-dod': 'DOD-',
  'opa-compliance-baseline': 'CB-',
  'opa-phase-gates': 'PG-',
};

export class OpaEvaluator implements IRuleEvaluatorStrategy {
  private policyCache: any = null;
  private inputBuilder: OpaInputBuilder;
  private ajv: Ajv;
  private schemaCache: Map<string, any> = new Map();

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {
    this.inputBuilder = new OpaInputBuilder(fs);
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  private async validateInput(category: string, input: any, corePath: string): Promise<string | null> {
    const schemaPath = path.join(corePath, 'rulesets', 'opa', 'schemas', `${category}.input.schema.json`);
    if (!await this.fs.exists(schemaPath)) {
      return null;
    }
    try {
      let validate = this.schemaCache.get(schemaPath);
      if (!validate) {
        const schemaContent = await this.fs.readFile(schemaPath);
        const schema = JSON.parse(schemaContent);
        validate = this.ajv.compile(schema);
        this.schemaCache.set(schemaPath, validate);
      }
      const valid = validate(input);
      if (!valid) {
        return this.ajv.errorsText(validate.errors, { separator: '; ' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Failed to compile/run input schema validation: ${msg}`;
    }
    return null;
  }

  async evaluateAll(
    rules: NormalizedRule[],
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult[]> {
    const wasmPath = path.join(ctx.corePath, 'rulesets', 'opa', 'policy.wasm');
    if (!await this.fs.exists(wasmPath)) {
      this.logger.error(`OPA WebAssembly policy not found at ${wasmPath}. Compile .rego rules first (run the OPA build step).`);
      return rules.map(rule => ({
        rule,
        result: 'failed' as const,
        message: `OPA policy not compiled — enforcement blocked. Expected wasm at: ${wasmPath}`,
      }));
    }

    try {
      if (!this.policyCache) {
        const wasmBuffer = await this.fs.readFileBuffer(wasmPath);
        this.policyCache = await loadPolicy(wasmBuffer);
      }

      // Build the input for OPA
      const input = await this.inputBuilder.build(ctx);
      
      // Perform schema validation per unique category
      const categories = Array.from(new Set(rules.map(r => r.category)));
      const categoryErrors = new Map<string, string>();
      for (const cat of categories) {
        const error = await this.validateInput(cat, input, ctx.corePath);
        if (error) {
          categoryErrors.set(cat, error);
        }
      }

      const passedRules: NormalizedRule[] = [];
      const failedResults: RuleEvaluationResult[] = [];

      for (const rule of rules) {
        const schemaError = categoryErrors.get(rule.category);
        if (schemaError) {
          failedResults.push({
            rule,
            result: 'failed',
            message: `OPA Input Schema Validation Failed: ${schemaError}`,
          });
        } else {
          passedRules.push(rule);
        }
      }

      let opaResults: RuleEvaluationResult[] = [];
      if (passedRules.length > 0) {
        // Evaluate against the OPA policy
        const resultSet: any = this.policyCache.evaluate(input);
        const violations: Record<string, unknown>[] = (resultSet?.[0]?.result) ? resultSet[0].result as Record<string, unknown>[] : [];
        
        opaResults = passedRules.map(rule => {
          const prefix = CONTEXT_AWARE_VIOLATION_PREFIXES[rule.id];
          const ruleViolations = prefix
            ? violations.filter((v: Record<string, unknown>) => typeof v.id === 'string' && (v.id as string).startsWith(prefix))
            : violations.filter((v: Record<string, unknown>) => v.id === rule.id);
          if (ruleViolations.length > 0) {
            return {
              rule,
              result: 'failed',
              message: ruleViolations.map((v: Record<string, unknown>) => v.message).join('; '),
            };
          }
          return {
            rule,
            result: 'passed'
          };
        });
      }

      return [...failedResults, ...opaResults];

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to evaluate OPA policy: ${msg}`);
      return rules.map(rule => ({
        rule,
        result: 'failed' as const,
        message: `OPA engine error — enforcement blocked: ${msg}`,
      }));
    }
  }
}
