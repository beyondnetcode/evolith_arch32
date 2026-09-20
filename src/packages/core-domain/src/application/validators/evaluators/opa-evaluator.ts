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
 * GT-675 — the entrypoint the compiled bundle exposes so it can state its own
 * scope. Built by `.harness/scripts/compile-opa-wasm.mjs`; the name is the only
 * thing shared between the two, and `27-opa-parity-gate` fails if it disappears.
 */
export const DECLARED_RULE_IDS_ENTRYPOINT = 'evolith/manifest/declared_rule_ids';

/**
 * GT-716 AC1 — the entrypoint through which the bundle states, per rule id, which
 * `input.…` paths the policy deciding that rule reads. Built by `compile-opa-wasm.mjs`
 * from the compiler's AST (`.harness/scripts/lib/rego-rule-inputs.mjs`), never from a
 * table kept here; `27-opa-parity-gate` fails if a bundle stops exposing it.
 */
export const RULE_INPUT_PATHS_ENTRYPOINT = 'evolith/manifest/rule_input_paths';

/**
 * GT-716 AC1 — facets whose ABSENCE is itself a fact, by the design of the policies
 * that read them, so a rule reading only these is evaluated rather than skipped when
 * they are missing.
 *
 * `qualityEvidence` / `qualityAdmissibilityPolicy` / `evaluationDate`: ADR-0111 — "the
 * consumer presented no evidence" and "presented an empty set" are the same verdict,
 * and both engines already agree on it (`PEA-01..04` pass on a bare run, natively and
 * in Rego). `evidence` / `waiver`: phase gates — nothing presented and nothing waived
 * are exactly what the gate must fail on, not a reason to abstain. `tenantId`: an audit
 * echo, never a premise.
 *
 * This is the one hand-kept list AC1 tolerates; GT-716 AC2 moves the declaration into
 * each rule's own file and this set goes with it.
 */
export const ABSENCE_IS_A_FACT: ReadonlySet<string> = new Set([
  'input.qualityEvidence',
  'input.qualityAdmissibilityPolicy',
  'input.evaluationDate',
  'input.evidence',
  'input.waiver',
  'input.tenantId',
]);

/**
 * The FACET an input path belongs to: the first segment under `input`, or the second
 * under the two containers the builder always emits (`satellite`, `core`). This is the
 * granularity at which "supplied or not" is decided (GT-694): `input.satellite.git` is
 * a facet a caller sends whole, `input.satellite.git.branchNameInvalid` is a field of
 * it. `null` for a path that names no facet (`input`, `input.satellite`).
 */
export function facetOfInputPath(path: string): string | null {
  const segments = path.split('.');
  if (segments[0] !== 'input' || segments.length < 2) return null;
  if (segments[1] === 'satellite' || segments[1] === 'core') {
    return segments.length >= 3 ? segments.slice(0, 3).join('.') : null;
  }
  return segments.slice(0, 2).join('.');
}

/**
 * The facets among `paths` that `input` does not carry, sorted and de-duplicated.
 *
 * Presence is "the key exists", not "the value is truthy": the builder emits every
 * observed key even when what it observed is `null` or `false` — that IS the fact — and
 * a caller who supplied `{ multiTenancy: { applicationFiltering: false } }` supplied the
 * facet. A key the builder never set and no caller sent is the one case that means the
 * bundle was asked about something nobody stated.
 */
export function absentFacets(input: unknown, paths: readonly string[]): string[] {
  const missing = new Set<string>();
  for (const path of paths) {
    const facet = facetOfInputPath(path);
    if (!facet || ABSENCE_IS_A_FACT.has(facet)) continue;
    let node: unknown = input;
    let present = true;
    for (const segment of facet.split('.').slice(1)) {
      if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, segment)) {
        present = false;
        break;
      }
      node = (node as Record<string, unknown>)[segment];
    }
    if (!present) missing.add(facet);
  }
  return [...missing].sort();
}

/**
 * GT-382, superseded by GT-693 — kept ONLY to read bundles compiled before the
 * provenance change, and deliberately not extended.
 *
 * The problem it was built for is real: a policy emits namespaced ids (`DOD-*`,
 * `CB-*`) that can never equal the `opa-<file>` id `deriveRuleId` builds from a
 * gate's `rules: ["rulesets/opa/<file>.rego"]` reference. The problem with the
 * SOLUTION was that it is a list somebody has to remember to update, and forgetting
 * is silent in the worst direction: the violation matches no rule, the branch falls
 * through to `passed`, and a policy that fired is reported as conformance.
 *
 * Measured on 2026-08-15 before the fix: 31 of the 33 shipped policies emit
 * namespaced ids and four were listed here. A satellite with `lodash: ^4.17.21` —
 * the literal thing `DEP-01` forbids — produced `DEP-01` in the wasm and a verdict
 * of `passed` for a gate referencing `version-pinning.rego`.
 *
 * `main.rego` now tags every aggregated violation with the policy that emitted it,
 * using exactly the id `deriveRuleId` produces, so attribution compares two things
 * equal by construction. This table is the fallback for a `policy`-less violation,
 * which today means one thing only: a `policy.wasm` older than that change. Adding
 * an entry here would be re-creating the defect, so `unattributedPolicies` below
 * reports what the fallback could not place instead of dropping it.
 */
export const CONTEXT_AWARE_VIOLATION_PREFIXES: Readonly<Record<string, string>> = {
  'opa-dod': 'DOD-',
  'opa-compliance-baseline': 'CB-',
  'opa-phase-gates': 'PG-',
  'opa-topology-composition': 'TPC-',
};

/**
 * Does this violation belong to this rule?
 *
 * Provenance first — `v.policy` is the emitting policy's derived id, so a gate
 * referencing that file owns it. This is what makes the two colliding id ranges
 * resolvable: `CLI-RR-01..05` are emitted by BOTH `cli-readiness` and
 * `cli-release-readiness`, and `TAX-05..11` by both `taxonomy` and
 * `repository-taxonomy` (10 of 197 ids collide), so no id-based scheme can tell
 * them apart and a prefix scheme attributes them to whichever rule asks first.
 */
export function violationBelongsToRule(
  violation: Record<string, unknown>,
  ruleId: string,
): boolean {
  // GT-700 — the two claims are ADDITIVE, and writing them as alternatives was a
  // regression GT-693 shipped.
  //
  // One violation legitimately answers to TWO different rules: the corpus rule that
  // shares its id (`ACL-02`), and the gate rule that pulled the policy in
  // (`opa-anti-corruption-layer`). GT-693 added the provenance tag as an early
  // return, and because `main.rego` tags EVERY violation the exact-id branch below
  // became dead code. Measured when it was found: 184 corpus rules are decidable by
  // exact id from the shipped policies and all 184 silently stopped being claimed,
  // which is why a whole-corpus OPA run reported 4 issues against native's 112.
  //
  // Found by an adversarial probe on GT-675, not by the suite that shipped GT-693 --
  // that suite pinned provenance-first and had no case for a corpus rule whose id
  // equals a violation id.
  if (violation.id === ruleId) return true;

  const provenance = violation.policy;
  if (typeof provenance === 'string') return provenance === ruleId;

  // Legacy bundle: no provenance on the wire.
  const prefix = CONTEXT_AWARE_VIOLATION_PREFIXES[ruleId];
  if (prefix) return typeof violation.id === 'string' && violation.id.startsWith(prefix);
  return false;
}

/**
 * GT-716 AC1 — the `skipped` a rule gets when the policy deciding it reads a facet
 * this run did not supply, or `null` when every facet it reads is present.
 *
 * A Rego body whose fact is missing is undefined: `not input.adapter.x` FIRES and
 * `input.satellite.git.y` never matches, so before this the same absence came back as
 * `failed` (ACL-01, DORA-01, SVC-01) or as `passed` (GIT-01, TPY-03) depending on how
 * the policy happened to be written. Measured on a satellite fresh from `init` the day
 * it landed: the bundle went from 133 rules "decided" to 10, and the 123 it stopped
 * deciding were all verdicts on input nobody had supplied.
 */
function skippedForAbsentFacets(
  rule: NormalizedRule,
  input: unknown,
  inputPaths: ReadonlyMap<string, readonly string[]>,
): RuleEvaluationResult | null {
  const missing = absentFacets(input, inputPaths.get(rule.id) ?? []);
  if (missing.length === 0) return null;
  return {
    rule,
    result: 'skipped',
    evaluability: 'supplied-facet-absent',
    message:
      `Not evaluated: the policy deciding '${rule.id}' reads ${missing.map((f) => `\`${f}\``).join(', ')}, `
      + `and this run supplied no such fact${missing.length > 1 ? 's' : ''}. An absent fact is not a verdict `
      + 'about the repository — supply it through the evaluation context (`facts`, GT-694) to have the rule decided.',
  };
}

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

  /**
   * GT-675 AC3 — ask the BUNDLE which rule ids it can decide.
   *
   * The set is produced at build time by `compile-opa-wasm.mjs` from the OPA
   * compiler's own AST and compiled into the wasm as the
   * `evolith/manifest/declared_rule_ids` entrypoint. It is deliberately not a
   * table in this file: `CONTEXT_AWARE_VIOLATION_PREFIXES` above is what a
   * hand-maintained list looks like after two years, and forgetting an entry
   * there fails GREEN.
   *
   * Returns `null` when the bundle cannot answer — a `policy.wasm` compiled
   * before this entrypoint existed. That case keeps the old behaviour rather
   * than mass-reclassifying an unknown bundle, and says so at WARN, because a
   * silent fallback to `passed` is the exact defect this method exists to end.
   */
  private readDeclaredRuleIds(policyCache: any, opaUrl?: string): ReadonlySet<string> | null {
    if (opaUrl) {
      // The sidecar exposes documents over HTTP and this read is synchronous; the
      // embedded wasm is the enforcing path. Say so instead of pretending.
      this.logger.warn(
        'OPA sidecar mode: the bundle was not asked which rules it declares, so rules with no '
        + 'violation are reported as passed. Use the embedded wasm for a coverage-honest verdict.',
      );
      return null;
    }
    try {
      const entrypoints = policyCache?.entrypoints;
      if (!entrypoints || !Object.prototype.hasOwnProperty.call(entrypoints, DECLARED_RULE_IDS_ENTRYPOINT)) {
        this.logger.warn(
          `OPA bundle does not expose '${DECLARED_RULE_IDS_ENTRYPOINT}' — it predates GT-675. `
          + 'Rules no policy decides will be reported as passed. Recompile with `npm run build:policy`.',
        );
        return null;
      }
      const resultSet: any = policyCache.evaluate({}, DECLARED_RULE_IDS_ENTRYPOINT);
      const ids = resultSet?.[0]?.result;
      if (!Array.isArray(ids) || ids.length === 0) {
        this.logger.warn('OPA bundle declared an empty rule-id set — treating coverage as unknown.');
        return null;
      }
      return new Set(ids.map((id: unknown) => String(id)));
    } catch (err) {
      this.logger.warn(`OPA bundle could not report its declared rule ids: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * GT-716 AC1 — ask the BUNDLE what each rule reads.
   *
   * Same contract as `readDeclaredRuleIds`: built at compile time from the AST, read
   * here, and `null` when the bundle cannot answer — a `policy.wasm` compiled before the
   * entrypoint existed, or the sidecar. That case keeps the previous behaviour (an absent
   * fact is reported as a verdict) and says so, because degrading silently is the defect
   * this method exists to end.
   */
  private readRuleInputPaths(policyCache: any, opaUrl?: string): ReadonlyMap<string, readonly string[]> | null {
    // The sidecar case is already announced by readDeclaredRuleIds on the same run.
    if (opaUrl) return null;
    try {
      const entrypoints = policyCache?.entrypoints;
      if (!entrypoints || !Object.prototype.hasOwnProperty.call(entrypoints, RULE_INPUT_PATHS_ENTRYPOINT)) {
        this.logger.warn(
          `OPA bundle does not expose '${RULE_INPUT_PATHS_ENTRYPOINT}' — it predates GT-716. `
          + 'A rule whose fact this run did not supply will be reported as a verdict. Recompile with `npm run build:policy`.',
        );
        return null;
      }
      const resultSet: any = policyCache.evaluate({}, RULE_INPUT_PATHS_ENTRYPOINT);
      const table = resultSet?.[0]?.result;
      if (!table || typeof table !== 'object' || Array.isArray(table) || Object.keys(table).length === 0) {
        this.logger.warn('OPA bundle declared an empty rule-input table — treating every declared rule as decidable.');
        return null;
      }
      const byRule = new Map<string, readonly string[]>();
      for (const [id, paths] of Object.entries(table)) {
        byRule.set(id, Array.isArray(paths) ? paths.map(String) : []);
      }
      return byRule;
    } catch (err) {
      this.logger.warn(`OPA bundle could not report the input paths its rules read: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
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

        // GT-693 — a violation nobody claims used to vanish here. It is now named,
        // with the policy that emitted it, because "the run said nothing" and "the
        // run found nothing" are different facts and only one of them is good news.
        // Reported at debug: for a partial rule selection most violations legitimately
        // belong to policies this run did not ask about, so warning would be noise —
        // what matters is that the information exists at all rather than being lost.
        const claimed = new Set<Record<string, unknown>>();

        // GT-675 — the bundle is asked what it can decide, BEFORE any rule is
        // called `passed`.
        //
        // Until this existed the class had no `skipped` path at all: "no violation
        // matched" was read as conformance, so a rule no policy emits came back
        // `passed`. Measured on this corpus: OPA reported `rulesSkipped: 0` against
        // native's 241, and answered `passed / exit 0` on `security/injection-
        // prevention` and `security/path-containment` where native failed with two
        // blocking issues each. `RuleEvaluationOutcome` had declared `skipped` the
        // whole time — the outcome existed in the type and was unreachable in the
        // class.
        const declared = this.readDeclaredRuleIds(policyCache, opaUrl);
        // GT-716 AC1 — and what each of them reads, so an absent fact is a skip below.
        const inputPaths = declared ? this.readRuleInputPaths(policyCache, opaUrl) : null;

        opaResults = passedRules.map(rule => {
          const ruleViolations = violations.filter((v: Record<string, unknown>) =>
            violationBelongsToRule(v, rule.id),
          );
          for (const v of ruleViolations) claimed.add(v);
          // GT-716 AC1 — an absent fact is not a verdict. Checked BEFORE the violations
          // are read, because a violation raised on a missing premise is the case, not
          // an exception to it; the violations were claimed above so they are not
          // reported as orphans of a rule that was never asked.
          const unasked = declared?.has(rule.id) && inputPaths ? skippedForAbsentFacets(rule, input, inputPaths) : null;
          if (unasked) return unasked;
          if (ruleViolations.length > 0) {
            return {
              rule,
              result: 'failed',
              message: ruleViolations.map((v: Record<string, unknown>) => v.message).join('; '),
            };
          }
          if (declared && !declared.has(rule.id)) {
            return {
              rule,
              result: 'skipped',
              evaluability: 'no-policy-in-bundle',
              message:
                `No reachable policy in the compiled OPA bundle decides '${rule.id}' — `
                + `the bundle declares ${declared.size} rule id(s) and this is not one of them. `
                + 'Not evaluated; this is not a verdict about the repository.',
            } as RuleEvaluationResult;
          }
          return {
            rule,
            result: 'passed'
          };
        });

        const orphans = violations.filter((v) => !claimed.has(v));
        if (orphans.length > 0) {
          const byPolicy = new Map<string, string[]>();
          for (const v of orphans) {
            const owner = typeof v.policy === 'string' ? v.policy : '<no provenance — bundle predates GT-693>';
            byPolicy.set(owner, [...(byPolicy.get(owner) ?? []), String(v.id)]);
          }
          this.logger.debug(
            `OPA: ${orphans.length} violation(s) matched no evaluated rule — ` +
              [...byPolicy.entries()].map(([p, ids]) => `${p}: ${ids.join(', ')}`).join(' | '),
          );
        }
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
