/**
 * Canonical topology catalog for the Evolith Smart CLI.
 *
 * This is the single source of truth the CLI uses to validate and normalize
 * `--topology`, `--level` and `--phase` inputs. It mirrors the topology
 * manifests under `rulesets/topologies/` and the `product.topology` enum in
 * `reference/config/evolith.config.schema.json`.
 *
 * Evolith Core defines 8 topologies across complementary dimensions. Three of
 * them form the **progressive axis** — a linear maturity progression
 * (`modular-monolith → distributed-modules → microservices`). The legacy
 * `F1/F2/F3` labels are aliases for that axis and remain accepted as deprecated
 * input only; new code and docs should use the canonical ids.
 */

export type TopologyDimension =
  | 'progressive-axis'
  | 'execution'
  | 'integration'
  | 'data'
  | 'ai';

export interface TopologyDescriptor {
  id: string;
  name: string;
  dimension: TopologyDimension;
}

export const CANONICAL_TOPOLOGIES: readonly TopologyDescriptor[] = [
  { id: 'modular-monolith', name: 'Modular Monolith', dimension: 'progressive-axis' },
  { id: 'distributed-modules', name: 'Distributed Modules', dimension: 'progressive-axis' },
  { id: 'microservices', name: 'Microservices', dimension: 'progressive-axis' },
  { id: 'serverless', name: 'Serverless', dimension: 'execution' },
  { id: 'edge-computing', name: 'Edge Computing', dimension: 'execution' },
  { id: 'event-driven', name: 'Event-Driven', dimension: 'integration' },
  { id: 'data-mesh', name: 'Data Mesh', dimension: 'data' },
  { id: 'agentic-ai', name: 'Agentic AI', dimension: 'ai' },
] as const;

export const TOPOLOGY_IDS: readonly string[] = CANONICAL_TOPOLOGIES.map((t) => t.id);

/**
 * The progressive maturity axis, ordered. Index + 1 maps to the legacy
 * `F1/F2/F3` level (F1 = index 0).
 */
export const PROGRESSIVE_AXIS: readonly string[] = [
  'modular-monolith',
  'distributed-modules',
  'microservices',
];

/** Legacy level (F1/F2/F3) → canonical progressive-axis id. */
export const LEVEL_TO_TOPOLOGY: Readonly<Record<string, string>> = {
  F1: 'modular-monolith',
  F2: 'distributed-modules',
  F3: 'microservices',
};

/** Canonical progressive-axis id → legacy level (F1/F2/F3). */
export const TOPOLOGY_TO_LEVEL: Readonly<Record<string, 'F1' | 'F2' | 'F3'>> = {
  'modular-monolith': 'F1',
  'distributed-modules': 'F2',
  'microservices': 'F3',
};

const LEVEL_PATTERN = /^F[1-3]$/i;

/** True when `value` is a canonical topology id. */
export function isCanonicalTopology(value: string): boolean {
  return TOPOLOGY_IDS.includes(value);
}

/** True when `value` is a legacy F1/F2/F3 level. */
export function isLegacyLevel(value: string): boolean {
  return LEVEL_PATTERN.test(value);
}

/**
 * Normalize any accepted topology input to a canonical id.
 * Accepts canonical ids (returned as-is) and legacy `F1/F2/F3` aliases.
 * Returns `null` for unknown input so callers can produce a helpful error.
 */
export function normalizeTopology(value: string): string | null {
  const trimmed = value.trim();
  if (isCanonicalTopology(trimmed)) return trimmed;
  if (isLegacyLevel(trimmed)) return LEVEL_TO_TOPOLOGY[trimmed.toUpperCase()];
  return null;
}

/**
 * Normalize a progressive-axis input (canonical id or F1/F2/F3) to the legacy
 * level the core-domain drift/validation services consume. Returns `null` when
 * the input is not on the progressive axis (e.g. `serverless`).
 */
export function toLegacyLevel(value: string): 'F1' | 'F2' | 'F3' | null {
  const trimmed = value.trim();
  if (isLegacyLevel(trimmed)) return trimmed.toUpperCase() as 'F1' | 'F2' | 'F3';
  if (TOPOLOGY_TO_LEVEL[trimmed]) return TOPOLOGY_TO_LEVEL[trimmed];
  return null;
}

/** Human-readable list of valid topology ids for CLI help/errors. */
export function topologyHelpList(): string {
  return TOPOLOGY_IDS.join(', ');
}

/**
 * Normalize a progressive-axis input to its phase number ('1' | '2' | '3').
 * Accepts the phase numbers themselves, canonical ids and legacy F1/F2/F3.
 * Returns `null` for anything off the progressive axis.
 */
export function toProgressivePhase(value: string): '1' | '2' | '3' | null {
  const trimmed = value.trim();
  if (trimmed === '1' || trimmed === '2' || trimmed === '3') return trimmed;
  const level = toLegacyLevel(trimmed);
  return level ? (level.slice(1) as '1' | '2' | '3') : null;
}
