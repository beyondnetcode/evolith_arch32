/**
 * IHarnessPort — `.harness` as an OFFICIAL capability provider (design rule #4).
 *
 * `.harness` stays the versioned, auditable, governed mechanism to run scripts,
 * playbooks, validators, audits and skills. The runtime does NOT replace it: it
 * DISCOVERS its capabilities (from `.harness/manifest.yaml`) and EXECUTES them
 * through this port. Swapping the process executor for a remote/sandboxed one is
 * an adapter change; the runtime is unaffected.
 */

import type { HarnessCapability } from '../contracts/capability';
import type { RuntimeContext } from '../contracts/runtime-context';

export interface HarnessExecutionRequest {
  /** Capability name as declared in the manifest. */
  readonly capability: string;
  /** Validated arguments for the capability. */
  readonly args?: Readonly<Record<string, unknown>>;
  /** Context forwarded for tracing/working-dir resolution (never embedded). */
  readonly context: RuntimeContext;
  /** When true, the executor must not perform side effects. */
  readonly dryRun?: boolean;
}

export interface HarnessExecutionResult {
  readonly ok: boolean;
  readonly capability: string;
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  /** Parsed structured output when the capability emits JSON. */
  readonly data?: Readonly<Record<string, unknown>>;
  readonly durationMs?: number;
}

export interface IHarnessPort {
  /** List every capability `.harness` declares. */
  discover(): Promise<readonly HarnessCapability[]>;
  /** Describe a single capability, or undefined if not declared. */
  describe(capability: string): Promise<HarnessCapability | undefined>;
  /** Execute a declared capability and return its raw/structured result. */
  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionResult>;
}
