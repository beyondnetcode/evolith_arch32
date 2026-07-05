/**
 * Loader for `.harness/manifest.yaml` — the convention that lets the runtime
 * DISCOVER `.harness` capabilities (design rule #4). The manifest is the
 * versioned, auditable declaration of every script/playbook/validator/audit/
 * skill/adapter, including its governance posture (permissions, approval, trace,
 * OPA). Parsing lives in the adapter layer only; the domain never sees YAML.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { HarnessCapability, HarnessCapabilityType } from '../../domain/contracts/capability';

interface RawCapability {
  name?: string;
  type?: string;
  description?: string;
  entry?: string;
  runner?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  permissions?: string[];
  requiresApproval?: boolean;
  emitsTrace?: boolean;
  requiresPolicy?: boolean;
  policyRef?: string;
}

interface RawManifest {
  version?: number;
  capabilities?: RawCapability[];
}

const VALID_TYPES: readonly HarnessCapabilityType[] = [
  'playbook', 'validator', 'audit', 'script', 'skill', 'adapter',
];

/** The `runner` field tells the process adapter HOW to execute the entry. */
export interface HarnessCapabilityRuntime extends HarnessCapability {
  readonly runner: 'node' | 'opa' | 'shell';
}

function toCapability(raw: RawCapability): HarnessCapabilityRuntime {
  if (!raw.name) throw new Error('manifest: a capability is missing "name".');
  const type = (VALID_TYPES.includes(raw.type as HarnessCapabilityType)
    ? raw.type
    : 'script') as HarnessCapabilityType;
  const runner = raw.runner === 'opa' || raw.runner === 'shell' ? raw.runner : 'node';
  return {
    name: raw.name,
    type,
    description: raw.description ?? '',
    entry: raw.entry,
    inputs: raw.inputs,
    outputs: raw.outputs,
    permissions: raw.permissions ?? [],
    requiresApproval: raw.requiresApproval ?? false,
    emitsTrace: raw.emitsTrace ?? true,
    requiresPolicy: raw.requiresPolicy ?? false,
    policyRef: raw.policyRef,
    runner,
  };
}

/** Parse a manifest string into runtime capabilities. */
export function parseManifest(raw: string): HarnessCapabilityRuntime[] {
  const doc = (parseYaml(raw) ?? {}) as RawManifest;
  const caps = Array.isArray(doc.capabilities) ? doc.capabilities : [];
  return caps.map(toCapability);
}

/** Load and parse `<harnessRoot>/<file>` from disk. */
export function loadManifest(harnessRoot: string, file = 'manifest.yaml'): HarnessCapabilityRuntime[] {
  const path = join(harnessRoot, file);
  const raw = readFileSync(path, 'utf8');
  return parseManifest(raw);
}
