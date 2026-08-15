import * as path from 'path';
import { IFileSystem, ILogger } from '../../../domain/interfaces';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { IRuleEvaluatorStrategy, WorkspaceEvaluationContext, RuleEvaluationResult } from './evaluator.interface';
import { loadPolicy } from '@open-policy-agent/opa-wasm';
import { OpaInputBuilder } from './opa-input-builder';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as crypto from 'crypto';

// Module-level caches to share compiled instances across OpaEvaluator lifecycles
const globalPolicyCache = new Map<string, any>();
const globalSchemaCache = new Map<string, any>();

/**
 * GT-382: context-aware policies emit namespaced violation ids (`DOD-*`, `CB-*`,
 * `PG-*`) that can never equal the path-derived rule id produced for a gate's
 * `rules: ["rulesets/opa/<file>.rego"]` reference (e.g. `deriveRuleId` →
 * `opa-dod`). For these policies a gate rule referencing the policy file owns
 * ALL of that policy's violations, so they are matched by id PREFIX. Every other
 * rule keeps exact-id matching, so this changes no other policy's behavior.
 */
export const CONTEXT_AWARE_VIOLATION_PREFIXES: Readonly<Record<string, string>> = {
  'opa-dod': 'DOD-',
  'opa-compliance-baseline': 'CB-',
  'opa-phase-gates': 'PG-',
  // GT-688 AC5 — `topology-composition.rego` emits `TPC-01`, which can never
  // equal the `opa-topology-composition` id derived from a gate's
  // `rules: ["rulesets/opa/topology-composition.rego"]`. Without this entry the
  // policy fires in the wasm and the rule is reported `passed`.
  'opa-topology-composition': 'TPC-',
};

export class OpaEvaluator implements IRuleEvaluatorStrategy {
  private inputBuilder: OpaInputBuilder;
  private ajv: Ajv;

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {
    this.inputBuilder = new OpaInputBuilder(fs);
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Resolve an OPA asset across layouts, post-`src/` move first.
   *
   * GT-632: these paths were built, not written as literals, so the refactor left
   * them behind where no literal scan could see them. The legacy location is kept
   * as a fallback because images built before the move still have it, and returns
   * the post-refactor path when neither exists so the error names the layout the
   * repository actually has.
   */
  private async resolveOpaAsset(corePath: string, ...tail: string[]): Promise<string> {
    const candidates = [
      path.join(corePath, 'src', 'rulesets', 'opa', ...tail),
      path.join(corePath, 'rulesets', 'opa', ...tail),
    ];
    for (const candidate of candidates) {
      if (await this.fs.exists(candidate)) return candidate;
    }
    return candidates[0];
  }

  private async validateInput(category: string, input: any, corePath: string): Promise<string | null> {
    const schemaPath = await this.resolveOpaAsset(corePath, 'schemas', `${category}.input.schema.json`);
    if (!await this.fs.exists(schemaPath)) {
      return null;
    }
    try {
      const schemaContent = await this.fs.readFile(schemaPath);
      const hash = crypto.createHash('sha256').update(schemaContent).digest('hex');
      let validate = globalSchemaCache.get(hash);
      if (!validate) {
        const schema = JSON.parse(schemaContent);
        validate = this.ajv.compile(schema);
        globalSchemaCache.set(hash, validate);
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
    const opaUrl = process.env.OPA_URL;
    let policyCache: any = null;

    try {
      if (!opaUrl) {
        const wasmPath = await this.resolveOpaAsset(ctx.corePath, 'policy.wasm');
        if (!await this.fs.exists(wasmPath)) {
          this.logger.error(`OPA WebAssembly policy not found at ${wasmPath}. Compile .rego rules first (run the OPA build step).`);
          return rules.map(rule => ({
            rule,
            result: 'failed' as const,
            message: `OPA policy not compiled — enforcement blocked. Expected wasm at: ${wasmPath}`,
          }));
        }

        const wasmBuffer = await this.fs.readFileBuffer(wasmPath);
        const hash = crypto.createHash('sha256').update(wasmBuffer).digest('hex');

        if (!globalPolicyCache.has(hash)) {
          // Keep only the latest to prevent memory leaks if WASM is rebuilt
          globalPolicyCache.clear();
          const policy = await loadPolicy(wasmBuffer);
          globalPolicyCache.set(hash, policy);
        }
        policyCache = globalPolicyCache.get(hash);
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
        let violations: Record<string, unknown>[] = [];

        if (opaUrl) {
          // Evaluate against the OPA sidecar via HTTP
          const res = await fetch(`${opaUrl}/evolith`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input })
          });
          if (!res.ok) {
            throw new Error(`OPA sidecar responded with status: ${res.status}`);
          }
          const data = await res.json() as { result?: Record<string, unknown>[] };
          violations = data.result || [];
        } else {
          // Evaluate against the embedded OPA wasm policy
          const resultSet: any = policyCache.evaluate(input);
          violations = (resultSet?.[0]?.result) ? resultSet[0].result as Record<string, unknown>[] : [];
        }

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
