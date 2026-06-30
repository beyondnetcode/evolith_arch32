/**
 * Capability + governance metadata.
 *
 * A *capability* is anything the runtime can invoke through a port: a `.harness`
 * playbook/validator/audit/script/skill, a Core evaluation kind, or a composite
 * of both. Every capability declares its governance posture (design rules #4,
 * #6, #7) so the runtime can enforce approval / policy / tracing UNIFORMLY,
 * regardless of which adapter ultimately runs it.
 */

/** What kind of underlying provider backs the capability. */
export type CapabilityKind = 'harness' | 'evaluation' | 'composite';

/** Classification of a `.harness` capability (mirrors `.harness/manifest.yaml`). */
export type HarnessCapabilityType =
  | 'playbook'
  | 'validator'
  | 'audit'
  | 'script'
  | 'skill'
  | 'adapter';

/** Governance flags shared by capabilities and harness tools. */
export interface GovernancePosture {
  /** Permission scopes required to run (e.g. ['read:repo', 'run:validator']). */
  readonly permissions: readonly string[];
  /** Whether a human must approve before execution (HITL). */
  readonly requiresApproval: boolean;
  /** Whether execution must publish a trace event to the Tracker. */
  readonly emitsTrace: boolean;
  /** Whether the result must pass OPA/ruleset policy validation. */
  readonly requiresPolicy: boolean;
  /** Optional explicit policy reference to evaluate against. */
  readonly policyRef?: string;
}

/** A single `.harness` capability as discovered from the manifest. */
export interface HarnessCapability extends GovernancePosture {
  readonly name: string;
  readonly type: HarnessCapabilityType;
  readonly description: string;
  /** Relative entry point inside `.harness` (script/playbook path or bin). */
  readonly entry?: string;
  /** Declared input parameters (JSON-schema-ish, kept intentionally loose). */
  readonly inputs?: Readonly<Record<string, unknown>>;
  /** Declared outputs the capability produces. */
  readonly outputs?: Readonly<Record<string, unknown>>;
}

/**
 * SkillDescriptor — how the runtime maps an INTENT (and/or explicit tool id) to
 * a concrete capability binding. Owned by the SkillRegistry port, never by the
 * caller. This is the indirection that lets `.harness`, the Core, or a future
 * engine back the same intent without changing callers.
 */
export interface SkillDescriptor extends GovernancePosture {
  /** Stable tool id callers may target directly (e.g. 'validate-discovery-gate'). */
  readonly id: string;
  /** Human description shown in CLI/chat listings. */
  readonly description: string;
  /** Intents that resolve to this skill (e.g. ['validate_discovery_gate']). */
  readonly intents: readonly string[];
  /** Which provider backs it. */
  readonly kind: CapabilityKind;
  /** For `harness`/`composite`: the harness capability name to execute. */
  readonly harnessCapability?: string;
  /** For `evaluation`/`composite`: the Core evaluation kinds to request. */
  readonly evaluationKinds?: readonly string[];
}
