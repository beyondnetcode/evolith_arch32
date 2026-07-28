/**
 * GT-610 — engine-proposed arguments, REVALIDATED before they reach a governed
 * capability.
 *
 * Every engine adapter can populate `AgentEnginePlan.proposedArguments`. Until
 * this module existed the runtime read only `plan.proposedTool` and executed the
 * skill with whatever `request.parameters` happened to hold — the right action,
 * recorded, run with the wrong inputs, which is the worst failure class an audit
 * product can ship.
 *
 * An engine is an UNTRUSTED source (an LLM, a remote orchestrator, a plugin), so
 * its arguments are never passed through as-is. They are merged under three
 * rules, and the decision is recorded in the trace so an auditor can reconstruct
 * WHICH set of arguments actually ran:
 *
 *  1. THE CALLER IS AUTHORITATIVE. A key the caller supplied is never
 *     overwritten by the engine; the engine may only FILL GAPS. A human who
 *     typed a value keeps it. (An engine echoing the caller's own value back —
 *     which `hermes`/`swarms`/`stub` all do via `?? request.parameters` — is
 *     classified as `echoed`, not as a rejection, so the trace stays readable.)
 *  2. THE SKILL'S DECLARED INPUT CONTRACT WINS. When the skill declares
 *     `inputs`, only declared keys are accepted and each value is type/enum
 *     checked against the declaration. Undeclared or mistyped keys are rejected
 *     with a reason.
 *  3. STRUCTURE IS ALWAYS CHECKED. Prototype-polluting keys (`__proto__`,
 *     `constructor`, `prototype`) and non-JSON-serializable values are rejected
 *     at any depth, contract or no contract.
 *
 * When a skill declares NO contract there is nothing to revalidate against, so
 * the behaviour is configurable (`InfrastructureDeps.engineArgumentPolicy`):
 *  - `gap-fill` (default): sanitized gap-fill under rules 1 and 3, and the trace
 *    records `contract: 'absent'` so the auditor sees the value came from an
 *    engine with no schema to check it against.
 *  - `contract-only`: an undeclared contract rejects every proposed key. Pick
 *    this where an engine must never introduce an argument nobody declared.
 *
 * Pure and side-effect free — no ports, no clock, trivially unit-testable.
 */

import type { SkillDescriptor } from '../domain/contracts/capability';

/** How to treat engine-proposed arguments for a skill with no declared contract. */
export type EngineArgumentPolicy = 'gap-fill' | 'contract-only';

/** Why a single proposed argument did not make it into the executed set. */
export interface ArgumentRejection {
  readonly key: string;
  readonly reason: string;
}

/** The audit record of the merge: which set ran, and what was discarded. */
export interface ArgumentMergeDecision {
  /** `caller` — nothing from the engine was applied; `engine-merged` — at least one key was. */
  readonly source: 'caller' | 'engine-merged';
  /** Engine identity that produced the proposal (provenance). */
  readonly engine?: string;
  /** Whether the skill declared an input contract to revalidate against. */
  readonly contract: 'declared' | 'absent';
  /** Policy applied to a contract-less skill. */
  readonly policy: EngineArgumentPolicy;
  /** Keys taken from the engine proposal. */
  readonly accepted: readonly string[];
  /** Keys the engine echoed back with the caller's own value (no-ops). */
  readonly echoed: readonly string[];
  /** Keys discarded, with the reason each was discarded. */
  readonly rejected: readonly ArgumentRejection[];
}

export interface ArgumentMergeResult {
  /** The parameter set that must actually be executed. */
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly decision: ArgumentMergeDecision;
}

/** Keys that can poison an object graph; refused at every depth, always. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Depth cap for the serializability walk (an engine payload is not a tree of trees). */
const MAX_DEPTH = 6;

export const DEFAULT_ENGINE_ARGUMENT_POLICY: EngineArgumentPolicy = 'gap-fill';

export function mergeEngineArguments(input: {
  /** Parameters the caller supplied (authoritative). */
  readonly caller?: Readonly<Record<string, unknown>>;
  /** Parameters the engine proposed (untrusted). */
  readonly proposed?: Readonly<Record<string, unknown>>;
  /** The resolved skill, whose `inputs` declaration is the contract. */
  readonly skill: Pick<SkillDescriptor, 'inputs'>;
  /** Engine identity, recorded for provenance. */
  readonly engine?: string;
  /** Behaviour for a skill that declares no contract. */
  readonly policy?: EngineArgumentPolicy;
}): ArgumentMergeResult {
  const caller = isPlainRecord(input.caller) ? input.caller : {};
  const policy = input.policy ?? DEFAULT_ENGINE_ARGUMENT_POLICY;
  const contractProps = readContract(input.skill?.inputs);
  const contract: 'declared' | 'absent' = contractProps ? 'declared' : 'absent';

  const accepted: string[] = [];
  const echoed: string[] = [];
  const rejected: ArgumentRejection[] = [];
  const merged: Record<string, unknown> = { ...caller };

  const proposed = isPlainRecord(input.proposed) ? input.proposed : undefined;

  for (const [key, value] of Object.entries(proposed ?? {})) {
    if (UNSAFE_KEYS.has(key)) {
      rejected.push({ key, reason: 'unsafe-key' });
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(caller, key)) {
      // Rule 1: the caller is authoritative. An identical value is a harmless
      // echo (engines default `proposedArguments` to `request.parameters`);
      // a DIFFERENT value is an attempted override and is recorded as such.
      if (deepEquals(caller[key], value)) echoed.push(key);
      else rejected.push({ key, reason: 'caller-authoritative' });
      continue;
    }

    if (!isJsonSafe(value, 0)) {
      rejected.push({ key, reason: 'non-serializable' });
      continue;
    }

    if (contractProps) {
      // Rule 2: revalidate against the declared contract.
      if (!Object.prototype.hasOwnProperty.call(contractProps, key)) {
        rejected.push({ key, reason: 'not-in-input-contract' });
        continue;
      }
      const spec = contractProps[key];
      const types = declaredTypes(spec);
      if (types.length > 0 && !types.some((t) => matchesType(t, value))) {
        rejected.push({ key, reason: `type-mismatch:${types.join('|')}` });
        continue;
      }
      const allowed = declaredEnum(spec);
      if (allowed && !allowed.some((a) => deepEquals(a, value))) {
        rejected.push({ key, reason: 'not-in-enum' });
        continue;
      }
    } else if (policy === 'contract-only') {
      // Nothing to revalidate against and the deployment refuses unchecked keys.
      rejected.push({ key, reason: 'no-input-contract' });
      continue;
    }

    merged[key] = value;
    accepted.push(key);
  }

  return {
    parameters: accepted.length > 0 ? merged : caller,
    decision: {
      source: accepted.length > 0 ? 'engine-merged' : 'caller',
      engine: input.engine,
      contract,
      policy,
      accepted,
      echoed,
      rejected,
    },
  };
}

/**
 * Read the skill's declared input contract. Two shapes are accepted because the
 * declaration is deliberately loose (it mirrors `HarnessCapability.inputs`):
 *  - JSON-Schema-ish: `{ type: 'object', properties: { gate: { type: 'string' } } }`
 *  - a plain map:     `{ gate: { type: 'string' }, retries: 'number' }`
 * Returns undefined when nothing usable is declared.
 */
function readContract(
  inputs: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!isPlainRecord(inputs)) return undefined;
  const properties = inputs['properties'];
  if (inputs['type'] === 'object') {
    return isPlainRecord(properties) && Object.keys(properties).length > 0
      ? { ...properties }
      : undefined;
  }
  return Object.keys(inputs).length > 0 ? { ...inputs } : undefined;
}

function declaredTypes(spec: unknown): string[] {
  if (typeof spec === 'string') return [spec];
  if (isPlainRecord(spec)) {
    const t = spec['type'];
    if (typeof t === 'string') return [t];
    if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

function declaredEnum(spec: unknown): unknown[] | undefined {
  if (isPlainRecord(spec) && Array.isArray(spec['enum'])) return [...(spec['enum'] as unknown[])];
  return undefined;
}

function matchesType(type: string, value: unknown): boolean {
  switch (type.toLowerCase()) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isPlainRecord(value);
    case 'null':
      return value === null;
    // An unknown/loose declaration must not silently reject a legitimate value.
    default:
      return true;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** JSON-serializable, with no poisoning keys anywhere in the graph. */
function isJsonSafe(value: unknown, depth: number): boolean {
  if (depth > MAX_DEPTH) return false;
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true;
    case 'number':
      return Number.isFinite(value);
    case 'object':
      break;
    default:
      return false; // undefined, function, symbol, bigint
  }
  if (Array.isArray(value)) return value.every((v) => isJsonSafe(v, depth + 1));
  if (!isPlainRecord(value)) return false; // Date, Map, class instances, …
  return Object.entries(value).every(
    ([k, v]) => !UNSAFE_KEYS.has(k) && isJsonSafe(v, depth + 1),
  );
}

function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEquals(v, b[i]));
  }
  if (isPlainRecord(a) && isPlainRecord(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEquals(a[k], b[k]));
  }
  return false;
}
