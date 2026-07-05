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
 * (`modular-monolith → distributed-modules → microservices`). The CLI accepts
 * only the canonical ids as input. The `F1/F2/F3` labels below are the internal
 * level encoding the core-domain drift/validation services consume — never a
 * user-facing input alias.
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

/** The progressive maturity axis, ordered (index + 1 = progressive level). */
export const PROGRESSIVE_AXIS: readonly string[] = [
  'modular-monolith',
  'distributed-modules',
  'microservices',
];

/**
 * Canonical progressive-axis id → internal level (`F1/F2/F3`). This is the
 * encoding the core-domain drift/validation services consume; it is not a
 * user-facing input alias.
 */
export const TOPOLOGY_TO_LEVEL: Readonly<Record<string, 'F1' | 'F2' | 'F3'>> = {
  'modular-monolith': 'F1',
  'distributed-modules': 'F2',
  'microservices': 'F3',
};

/** True when `value` is a canonical topology id. */
export function isCanonicalTopology(value: string): boolean {
  return TOPOLOGY_IDS.includes(value);
}

/**
 * Normalize a topology input to a canonical id. Accepts canonical ids only
 * (returned trimmed). Returns `null` for unknown input so callers can produce a
 * helpful error.
 */
export function normalizeTopology(value: string): string | null {
  const trimmed = value.trim();
  return isCanonicalTopology(trimmed) ? trimmed : null;
}

/**
 * Map a canonical progressive-axis id to the internal level the core-domain
 * drift/validation services consume. Returns `null` when the input is not on
 * the progressive axis (e.g. `serverless`).
 */
export function toLegacyLevel(value: string): 'F1' | 'F2' | 'F3' | null {
  return TOPOLOGY_TO_LEVEL[value.trim()] ?? null;
}

/** Human-readable list of valid topology ids for CLI help/errors. */
export function topologyHelpList(): string {
  return TOPOLOGY_IDS.join(', ');
}

/**
 * Map a progressive-axis input to its phase number ('1' | '2' | '3').
 * Accepts the phase numbers themselves and canonical progressive-axis ids.
 * Returns `null` for anything off the progressive axis.
 */
export function toProgressivePhase(value: string): '1' | '2' | '3' | null {
  const trimmed = value.trim();
  if (trimmed === '1' || trimmed === '2' || trimmed === '3') return trimmed;
  const level = toLegacyLevel(trimmed);
  return level ? (level.slice(1) as '1' | '2' | '3') : null;
}
