/**
 * PolicyCompiler (GT-516 · EAG-10).
 *
 * The design-time half of the enforcer seam. Where GT-514/GT-515 RUN a static
 * analyzer and normalize its output into canonical {@link Violation}s, the
 * PolicyCompiler goes the other direction: it turns an authored governance rule's
 * `enforce:` block into the tool's OWN native check configuration — for
 * dependency-cruiser, a `forbidden` rule fragment.
 *
 * Graceful degradation is the load-bearing invariant. A rule a tool cannot express
 * NEVER throws and NEVER fails the whole ruleset. It yields a per-rule
 * {@link FallbackNotice} that tells the caller either to keep evaluating the rule on
 * the native engine (`fallback: 'native'`) or to skip it because the tool's runtime
 * is incompatible with the workspace (`fallback: 'skip'` — e.g. a PHP-only or
 * IaC-only analyzer pointed at a Node repository). This is why the enforcer seam can
 * onboard tools with narrow capability envelopes (NetArchTest expresses cycles;
 * Deptrac targets PHP layer graphs; Conftest evaluates IaC manifests) without any
 * one of them being able to break governance for the rest of the ruleset.
 *
 * SCOPE (GT-516 verifiable slice): compile + normalize + per-rule fallback only.
 * Real tool EXECUTION (AC1 "run") and the round-trip zero-false-positive corpus
 * (AC3) are gated on the GT-512 sandbox — the compiler emits the config those steps
 * will consume, but does not spawn a process.
 */

import type { ViolationSeverity } from '../../../domain/violation';
import type { EnforcerRuntime } from './enforcer.types';
import { DEPENDENCY_CRUISER_TOOL } from './adapters/dependency-cruiser-adapter';

/** How hard a compiled check fails: `block` → error severity, `warn` → advisory. */
export type EnforceMode = 'warn' | 'block';

/**
 * The full `enforce:` block an authored rule may carry (GT-516). A superset of the
 * routing-only {@link EnforceDescriptor} on {@link NormalizedRule}: adds the compile
 * inputs (`config`/`configRef`/`severityMap`/`mode`) the PolicyCompiler consumes.
 */
export interface EnforceBlock {
  /** `'enforcer'` routes to an adapter; `native`/`opa` stay on their own engine. */
  readonly engine: 'native' | 'opa' | 'enforcer';
  /** Enforcer tool that owns this rule (matches an `enforcer-catalog.json` entry). */
  readonly tool: string;
  /** The tool's own rule id, when it differs from the Evolith rule id. */
  readonly toolRuleId?: string;
  /** Runtime ecosystem the analyzer needs (selects the adapter / gates fallback). */
  readonly runtime?: EnforcerRuntime;
  /** Tool-native config fragment, inlined (e.g. a depcruise `from`/`to` clause). */
  readonly config?: Readonly<Record<string, unknown>>;
  /** Reference to an external tool config, when it is not inlined. */
  readonly configRef?: string;
  /** Maps a tool's own severity vocabulary onto canonical {@link ViolationSeverity}. */
  readonly severityMap?: Readonly<Record<string, ViolationSeverity>>;
  /** Enforcement strength. Defaults from the rule's `blocking` flag when omitted. */
  readonly mode?: EnforceMode;
}

/** The minimal rule shape the compiler reads: id, its enforce block, and a few hints. */
export interface CompilableRule {
  readonly id: string;
  readonly enforce?: EnforceBlock;
  /** Rule taxonomy (e.g. `layer-structure`, `dependency-direction`) — drives compilability. */
  readonly category?: string;
  /** Human title, carried into the compiled fragment's `comment`. */
  readonly title?: string;
  /** Whether the rule blocks; the default enforcement mode when `mode` is unset. */
  readonly blocking?: boolean;
  readonly layer?: string;
}

/** A rule successfully lowered to its tool's native check configuration. */
export interface CompiledCheck {
  readonly kind: 'compiled';
  readonly ruleId: string;
  readonly tool: string;
  readonly runtime: EnforcerRuntime;
  /** The id the tool will report the violation under (`toolRuleId ?? ruleId`). */
  readonly toolRuleId: string;
  readonly mode: EnforceMode;
  /** Native tool config fragment. dependency-cruiser → a `forbidden` rule object. */
  readonly check: Readonly<Record<string, unknown>>;
}

/** `native` → keep the rule on the native engine; `skip` → runtime is incompatible. */
export type FallbackKind = 'native' | 'skip';

/** A rule a tool could not express — degraded per-rule instead of failing the run. */
export interface FallbackNotice {
  readonly kind: 'fallback';
  readonly ruleId: string;
  readonly tool: string;
  readonly fallback: FallbackKind;
  readonly reason: string;
}

export type CompileOutcome = CompiledCheck | FallbackNotice;

export interface CompiledRuleset {
  readonly compiled: readonly CompiledCheck[];
  readonly fallbacks: readonly FallbackNotice[];
}

/** depcruise severity vocabulary a compiled fragment carries. */
type DepcruiseSeverity = 'error' | 'warn' | 'info';

const MODE_TO_DEPCRUISE_SEVERITY: Readonly<Record<EnforceMode, DepcruiseSeverity>> = {
  block: 'error',
  warn: 'warn',
};

/** Resolve the enforcement mode: explicit `mode` wins, else derive from `blocking`. */
function resolveMode(rule: CompilableRule, block: EnforceBlock): EnforceMode {
  if (block.mode) return block.mode;
  return rule.blocking === false ? 'warn' : 'block';
}

/** A rule is a cycle rule when its category or (tool)id names a cycle/circular check. */
function isCycleRule(rule: CompilableRule, block: EnforceBlock): boolean {
  const haystack = [rule.category, rule.id, block.toolRuleId].filter(Boolean).join(' ').toLowerCase();
  return /cycle|circular|acyclic/.test(haystack);
}

/** Categories dependency-cruiser can express as a module-graph boundary rule. */
const DEPCRUISE_BOUNDARY_CATEGORIES = new Set([
  'layer-structure',
  'dependency-direction',
  'boundary',
  'aop-isolation',
]);

/** Outcome of a single tool compiler: either a native fragment or a fallback. */
type ToolCompileResult =
  | { readonly check: Readonly<Record<string, unknown>> }
  | { readonly fallback: FallbackKind; readonly reason: string };

/**
 * A tool's compilation capability. `runtime` is the ecosystem it drives; `compile`
 * lowers ONE rule to the tool's native fragment or reports why it cannot.
 */
interface ToolCompiler {
  readonly runtime: EnforcerRuntime;
  compile(rule: CompilableRule, block: EnforceBlock): ToolCompileResult;
}

/**
 * dependency-cruiser (Node/TS). Expresses cycles and boundary/layer rules. A cycle
 * rule needs no author config (`to.circular`); a boundary rule needs a `config`
 * fragment carrying `from`/`to` path clauses — without one it degrades to native
 * rather than emitting an all-matching (and therefore false-positive-prone) rule.
 */
const dependencyCruiserCompiler: ToolCompiler = {
  runtime: 'node',
  compile(rule, block) {
    const severity = MODE_TO_DEPCRUISE_SEVERITY[resolveMode(rule, block)];
    const name = block.toolRuleId ?? rule.id;
    const base = { name, comment: rule.title ?? rule.id, severity };

    if (isCycleRule(rule, block)) {
      return { check: { ...base, from: {}, to: { circular: true }, ...(block.config ?? {}) } };
    }
    if (block.config && (block.config.from || block.config.to)) {
      // Author supplied the module-graph clause — lower it verbatim under the rule name.
      return { check: { ...base, ...block.config } };
    }
    if (block.configRef) {
      return { check: { ...base, $configRef: block.configRef } };
    }
    if (rule.category && DEPCRUISE_BOUNDARY_CATEGORIES.has(rule.category)) {
      return {
        fallback: 'native',
        reason:
          `dependency-cruiser boundary rule '${name}' needs a from/to config fragment ` +
          `(enforce.config or enforce.configRef); none supplied — evaluated by the native engine`,
      };
    }
    return {
      fallback: 'native',
      reason:
        `rule '${rule.id}' (category '${rule.category ?? 'n/a'}') is not expressible as a ` +
        `dependency-cruiser module-graph rule`,
    };
  },
};

/**
 * NetArchTest (.NET). In this seam it expresses dependency CYCLES only; any other
 * construct degrades to the native engine (never a false pass).
 */
const netArchTestCompiler: ToolCompiler = {
  runtime: 'dotnet',
  compile(rule, block) {
    if (isCycleRule(rule, block)) {
      return {
        check: {
          assertion: 'HaveNoCyclicDependencies',
          rule: block.toolRuleId ?? rule.id,
          mode: resolveMode(rule, block),
        },
      };
    }
    return {
      fallback: 'native',
      reason:
        `NetArchTest compiles cycle assertions only; rule '${rule.id}' ` +
        `(category '${rule.category ?? 'n/a'}') is not cycle-expressible`,
    };
  },
};

/** Deptrac (PHP layer graphs). Compilable only against a PHP runtime. */
const deptracCompiler: ToolCompiler = {
  runtime: 'php',
  compile(rule, block) {
    if (block.runtime && block.runtime !== 'php') {
      return {
        fallback: 'skip',
        reason: `Deptrac targets PHP layer graphs; runtime '${block.runtime}' is not supported`,
      };
    }
    return {
      check: {
        ruleset: block.toolRuleId ?? rule.id,
        layer: rule.layer ?? rule.category ?? rule.id,
        mode: resolveMode(rule, block),
        ...(block.config ?? {}),
      },
    };
  },
};

/** Conftest (OPA/Rego over IaC/config manifests). Compilable only for the IaC runtime. */
const conftestCompiler: ToolCompiler = {
  runtime: 'iac',
  compile(rule, block) {
    if (block.runtime && block.runtime !== 'iac') {
      return {
        fallback: 'skip',
        reason: `Conftest evaluates IaC/config manifests; runtime '${block.runtime}' is not supported`,
      };
    }
    return {
      check: {
        policy: block.configRef ?? block.toolRuleId ?? rule.id,
        namespace: rule.category ?? 'main',
        mode: resolveMode(rule, block),
        ...(block.config ?? {}),
      },
    };
  },
};

/** import-linter (Python import contracts, grimp-backed). Python runtime only. */
const importLinterCompiler: ToolCompiler = {
  runtime: 'python',
  compile(rule, block) {
    if (block.runtime && block.runtime !== 'python') {
      return {
        fallback: 'skip',
        reason: `import-linter enforces Python import contracts; runtime '${block.runtime}' is not supported`,
      };
    }
    return {
      check: {
        contract: block.toolRuleId ?? rule.id,
        type: isCycleRule(rule, block) ? 'independence' : 'forbidden',
        mode: resolveMode(rule, block),
        ...(block.config ?? {}),
      },
    };
  },
};

/** Registry keyed by the enforcer-catalog tool id (case-insensitive lookup). */
const TOOL_COMPILERS: Readonly<Record<string, ToolCompiler>> = {
  [DEPENDENCY_CRUISER_TOOL]: dependencyCruiserCompiler,
  netarchtest: netArchTestCompiler,
  deptrac: deptracCompiler,
  conftest: conftestCompiler,
  'import-linter': importLinterCompiler,
};

function lookupToolCompiler(tool: string): ToolCompiler | undefined {
  return TOOL_COMPILERS[tool] ?? TOOL_COMPILERS[tool.toLowerCase()];
}

/**
 * Compile ONE rule's `enforce:` block into a {@link CompiledCheck}, or a
 * {@link FallbackNotice} when the tool cannot express it. NEVER throws — an
 * uncompilable rule is a routing decision, not an error.
 *
 * A rule with no `enforce` block (or one not routed to the enforcer engine) returns
 * a `native` fallback: it is simply evaluated by the native engine.
 */
export function compileRule(rule: CompilableRule): CompileOutcome {
  const block = rule.enforce;
  if (!block || block.engine !== 'enforcer') {
    return {
      kind: 'fallback',
      ruleId: rule.id,
      tool: block?.tool ?? 'native',
      fallback: 'native',
      reason: `rule '${rule.id}' is not enforcer-routed (engine '${block?.engine ?? 'native'}')`,
    };
  }

  const compiler = lookupToolCompiler(block.tool);
  if (!compiler) {
    return {
      kind: 'fallback',
      ruleId: rule.id,
      tool: block.tool,
      fallback: 'skip',
      reason: `no compiler registered for enforcer tool '${block.tool}'`,
    };
  }

  const outcome = compiler.compile(rule, block);
  if ('fallback' in outcome) {
    return { kind: 'fallback', ruleId: rule.id, tool: block.tool, fallback: outcome.fallback, reason: outcome.reason };
  }
  return {
    kind: 'compiled',
    ruleId: rule.id,
    tool: block.tool,
    runtime: block.runtime ?? compiler.runtime,
    toolRuleId: block.toolRuleId ?? rule.id,
    mode: resolveMode(rule, block),
    check: outcome.check,
  };
}

/**
 * Compile a whole ruleset. Only enforcer-routed rules (`enforce.engine ===
 * 'enforcer'`) are considered; native rules are left for the native engine and do
 * not appear in either bucket. The result partitions the enforcer rules into
 * {@link CompiledCheck}s and {@link FallbackNotice}s — one wholesale-uncompilable
 * rule can never take the rest down with it.
 */
export function compileRuleset(rules: readonly CompilableRule[]): CompiledRuleset {
  const compiled: CompiledCheck[] = [];
  const fallbacks: FallbackNotice[] = [];
  for (const rule of rules) {
    if (rule.enforce?.engine !== 'enforcer') continue;
    const outcome = compileRule(rule);
    if (outcome.kind === 'compiled') compiled.push(outcome);
    else fallbacks.push(outcome);
  }
  return { compiled, fallbacks };
}

/**
 * Assemble the compiled dependency-cruiser checks into a ready-to-use
 * `.dependency-cruiser` config fragment (`{ forbidden: [...] }`). Non-node checks
 * are ignored — each tool aggregates into its own native config elsewhere.
 */
export function toDependencyCruiserConfig(
  compiled: readonly CompiledCheck[],
): { readonly forbidden: ReadonlyArray<Readonly<Record<string, unknown>>> } {
  return {
    forbidden: compiled.filter((c) => c.tool === DEPENDENCY_CRUISER_TOOL).map((c) => c.check),
  };
}
