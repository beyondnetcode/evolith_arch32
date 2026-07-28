/**
 * GT-605 — ONE typed evidence-edge model, published where BOTH sides can reach it.
 *
 * The state this replaces
 * ----------------------
 * Two evidence graphs existed, each missing the other's half:
 *
 *  - the Core declared typed edges in
 *    `@beyondnet/evolith-core-domain` (`src/evidence/evidence-graph.ts`:
 *    `{ from: string; to: string; relationship: 'requires' | 'validates' | 'blocks' }`)
 *    and had **zero consumers outside its own spec file** — a typed model that
 *    nothing persists;
 *  - the Tracker persisted `EvidenceRecordProps.References` as a `List<string>`
 *    in a jsonb column whose only non-test reader is a linear `Contains()` used
 *    for external-id dedup — a persisted model that nothing types. No edge
 *    table, no edge type, no reverse lookup, no depth bound.
 *
 * So "which ADR moved because of which gate decision because of which agent
 * turn" was unanswerable: the Core knew the vocabulary and stored nothing, the
 * Tracker stored strings and knew no vocabulary.
 *
 * What this module is
 * -------------------
 * The single typed model, in the package both sides already depend on at a
 * pinned SemVer. It is deliberately more than a type alias, because a shared
 * *type* would still leave the two sides free to disagree about direction,
 * about how a `List<string>` reference maps onto an edge, and about what a
 * "depth-2 traversal" means. It therefore publishes, as plain data and pure
 * functions with no imports and no I/O:
 *
 *  1. {@link EVIDENCE_EDGE_TYPES} — the edge vocabulary, a strict superset of
 *     the Core's three, and {@link EVIDENCE_EDGE_SEMANTICS}, which fixes the
 *     DIRECTION of each one in a sentence, so `from`/`to` cannot be swapped by
 *     an independent implementation.
 *  2. {@link EvidenceNodeRef} plus {@link formatEvidenceRef} /
 *     {@link parseEvidenceRef} — a canonical string encoding for a node, which
 *     is what makes the Tracker's existing `List<string>` column mechanically
 *     migratable rather than a rewrite (see {@link edgesFromLegacyReferences}).
 *  3. {@link traverseEvidenceGraph} — the depth-bounded traversal itself, so
 *     "depth 2, reverse, `caused_by` only" resolves to the same node set on
 *     both sides instead of to two similar-looking SQL/TS implementations.
 *  4. {@link EVIDENCE_GRAPH_QUERIES} and
 *     {@link EVIDENCE_EDGE_STORAGE_CONTRACT} — the queries the persistent side
 *     must serve and the table/index shape that serves them. This repository
 *     does NOT own the Tracker's schema; these two constants are the
 *     specification the Tracker's migration is written against, and the thing a
 *     reviewer can diff a proposed migration with.
 *
 * Scope boundary: the `evidence_edges` table, its backfill migration and the
 * depth-bounded endpoint live in `beyondnetcode/evolith_tracker`. Nothing here
 * builds them; everything here is what they must conform to.
 */

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/**
 * Kinds of thing an evidence edge can connect.
 *
 * Every entry is something at least one of the two sides already produces:
 * `artifact` and `ruleset-rule` come from the Core's `EvaluationResult`
 * (`results.artifact[].artifactId`, `rulesExecuted[].ruleId`); `gate-decision`
 * and `evidence-record` are Tracker rows; `adr` and `initiative` are the
 * governance subjects the audit question is asked about; `agent-turn` is the
 * agent-runtime unit of work that causes the other three to move.
 *
 * This list is CLOSED on purpose: an open `kind` is how the Tracker's
 * `List<string>` became untyped in the first place.
 */
export const EVIDENCE_NODE_KINDS = Object.freeze([
  'adr',
  'agent-turn',
  'artifact',
  'evaluation',
  'evidence-record',
  'gate-decision',
  'initiative',
  'ruleset-rule',
] as const);

export type EvidenceNodeKind = (typeof EVIDENCE_NODE_KINDS)[number];

/** A node in the evidence graph: a kind plus an id that is unique within it. */
export interface EvidenceNodeRef {
  readonly kind: EvidenceNodeKind;
  /** Id unique within `kind` (an ADR id, a gate-decision row id, a turn id…). */
  readonly id: string;
}

/** Scheme of the canonical node encoding, e.g. `evidence://adr/ADR-0101`. */
export const EVIDENCE_REF_SCHEME = 'evidence';

/** True when `value` is one of the closed {@link EVIDENCE_NODE_KINDS}. */
export function isEvidenceNodeKind(value: unknown): value is EvidenceNodeKind {
  return typeof value === 'string' && (EVIDENCE_NODE_KINDS as readonly string[]).includes(value);
}

/**
 * Canonical string form of a node: `evidence://<kind>/<id>`.
 *
 * This is the bridge to the Tracker's existing `References` column, which is a
 * `List<string>`: an already-stored reference either parses as one of these (and
 * is a typed node) or does not (and is a legacy opaque external id). Nothing has
 * to be guessed.
 */
export function formatEvidenceRef(ref: EvidenceNodeRef): string {
  return `${EVIDENCE_REF_SCHEME}://${ref.kind}/${ref.id}`;
}

/** Inverse of {@link formatEvidenceRef}; `null` for anything not canonical. */
export function parseEvidenceRef(value: string | null | undefined): EvidenceNodeRef | null {
  if (typeof value !== 'string') return null;
  const prefix = `${EVIDENCE_REF_SCHEME}://`;
  if (!value.startsWith(prefix)) return null;
  const rest = value.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const kind = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  if (!isEvidenceNodeKind(kind) || id.length === 0) return null;
  return Object.freeze({ kind, id });
}

/** Structural equality of two node refs. */
export function sameEvidenceNode(a: EvidenceNodeRef, b: EvidenceNodeRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

/**
 * The three edge types the Core already declares
 * (`core-domain/src/evidence/evidence-graph.ts`). Kept verbatim so adopting this
 * contract is a widening for the Core, never a breaking change.
 */
export const CORE_NATIVE_EDGE_TYPES = Object.freeze(['requires', 'validates', 'blocks'] as const);

/**
 * The published edge vocabulary: the Core's three plus `caused_by`.
 *
 * `caused_by` is the one addition, and it is not decoration: the acceptance
 * criterion for this gap is the sentence "which ADR moved BECAUSE OF which gate
 * decision BECAUSE OF which agent turn", and none of `requires` / `validates` /
 * `blocks` expresses causation. Without it the traversal that is claimed as the
 * stronger half of the moat cannot be written at all.
 */
export const EVIDENCE_EDGE_TYPES = Object.freeze([
  ...CORE_NATIVE_EDGE_TYPES,
  'caused_by',
] as const);

export type EvidenceEdgeType = (typeof EVIDENCE_EDGE_TYPES)[number];

/** True when `value` is a published edge type. */
export function isEvidenceEdgeType(value: unknown): value is EvidenceEdgeType {
  return typeof value === 'string' && (EVIDENCE_EDGE_TYPES as readonly string[]).includes(value);
}

/**
 * DIRECTION, fixed in prose so two independent implementations cannot disagree
 * about which end is `from`.
 *
 * `reading` is the sentence an edge means, read `from` → `to`.
 * `inverseReading` is the same edge read `to` → `from`, which is exactly what a
 * reverse-index lookup answers.
 */
export const EVIDENCE_EDGE_SEMANTICS: Readonly<
  Record<EvidenceEdgeType, { readonly reading: string; readonly inverseReading: string }>
> = Object.freeze({
  requires: Object.freeze({
    reading: '{from} cannot be considered complete without {to}',
    inverseReading: '{to} is required by {from}',
  }),
  validates: Object.freeze({
    reading: '{from} is evidence that {to} holds',
    inverseReading: '{to} is validated by {from}',
  }),
  blocks: Object.freeze({
    reading: '{from} prevents {to} from advancing',
    inverseReading: '{to} is blocked by {from}',
  }),
  caused_by: Object.freeze({
    reading: '{from} changed because of {to}',
    inverseReading: '{to} caused the change in {from}',
  }),
});

/**
 * One typed, directed, timestamped edge.
 *
 * `occurredAt` is what makes the ledger auditable rather than merely
 * navigable — an evidence chain without time cannot answer "as of the decision,
 * what was known". It is an ISO-8601 instant, the same encoding
 * `EvaluationResult.evaluatedAt` uses.
 */
export interface EvidenceEdge {
  readonly from: EvidenceNodeRef;
  readonly to: EvidenceNodeRef;
  readonly type: EvidenceEdgeType;
  /** ISO-8601 instant at which the relation became true. */
  readonly occurredAt: string;
  /** Who asserted the edge (`evolith-core`, a Tracker user id, an agent id). */
  readonly assertedBy?: string;
  /**
   * Free-form provenance of the assertion (an evaluation correlation id, a
   * migration tag such as `backfill:ReferencesJson`). Opaque to the traversal.
   */
  readonly provenance?: string;
}

/** Reverses an edge, swapping the ends. The TYPE is preserved — only the direction of travel changes. */
export function invertEdge(edge: EvidenceEdge): EvidenceEdge {
  return { ...edge, from: edge.to, to: edge.from };
}

/**
 * Stable identity of an edge, for the table's uniqueness constraint and for
 * idempotent re-assertion. Deliberately EXCLUDES `assertedBy` / `provenance`
 * (metadata about the claim) and INCLUDES `occurredAt` (the same relation
 * asserted at two instants is two ledger facts, not one).
 */
export function evidenceEdgeKey(edge: EvidenceEdge): string {
  return [formatEvidenceRef(edge.from), edge.type, formatEvidenceRef(edge.to), edge.occurredAt].join('|');
}

// ---------------------------------------------------------------------------
// Migration from the Tracker's `List<string>` references
// ---------------------------------------------------------------------------

/** Outcome of interpreting one legacy `References` entry. */
export interface LegacyReferenceMapping {
  /** The original string, verbatim. */
  readonly reference: string;
  /** The typed edge it maps to, or `null` when the string is not canonical. */
  readonly edge: EvidenceEdge | null;
}

/**
 * Mechanical backfill of the Tracker's `EvidenceRecordProps.References`
 * (`List<string>` in a jsonb column) into typed edges.
 *
 * Each reference is read as "this evidence record VALIDATES the referenced
 * thing" — which is what the column has always meant in practice, and the only
 * reading that does not invent information. Entries that are not canonical
 * {@link formatEvidenceRef} strings map to `null`: they are opaque external ids
 * (the dedup use of `Contains()`), they are NOT edges, and the migration must
 * leave them in `References`. That is why the acceptance criterion keeps
 * `References` as a projection for one release — this function is the evidence
 * that the two sets are disjoint and that dropping the column early would lose
 * the external ids.
 */
export function edgesFromLegacyReferences(
  subject: EvidenceNodeRef,
  references: readonly string[] | null | undefined,
  occurredAt: string,
  provenance = 'backfill:ReferencesJson',
): readonly LegacyReferenceMapping[] {
  return Object.freeze(
    (references ?? []).map((reference) => {
      const target = parseEvidenceRef(reference);
      return Object.freeze({
        reference,
        edge: target
          ? Object.freeze({
              from: subject,
              to: target,
              type: 'validates' as const,
              occurredAt,
              assertedBy: 'evolith_tracker',
              provenance,
            })
          : null,
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// The traversal — one implementation, shared
// ---------------------------------------------------------------------------

/** Which way to walk: along the edges, against them, or both. */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

export interface TraversalOptions {
  /**
   * Maximum number of hops. `0` returns just the start node. A traversal
   * WITHOUT a bound is the defect, not the feature: the ledger is append-only
   * and an unbounded walk is unbounded work on a growing table.
   */
  readonly maxDepth: number;
  /** Default `outgoing`. `incoming` is the reverse lookup the jsonb column cannot serve. */
  readonly direction?: TraversalDirection;
  /** Restrict to these edge types. Omitted ⇒ all of {@link EVIDENCE_EDGE_TYPES}. */
  readonly types?: readonly EvidenceEdgeType[];
}

/** One node reached by {@link traverseEvidenceGraph}, with how it was reached. */
export interface TraversalHit {
  readonly node: EvidenceNodeRef;
  /** Hops from the start node; the start node itself is `0`. */
  readonly depth: number;
  /** Edges walked from the start node to this one, in order. Empty at depth 0. */
  readonly path: readonly EvidenceEdge[];
}

/**
 * Depth-bounded breadth-first traversal of an edge set.
 *
 * Pure and in-memory by design: it is the SEMANTIC definition both sides
 * conform to. The Tracker will not run this over its whole table — it will run
 * the recursive CTE described in {@link EVIDENCE_GRAPH_QUERIES} — but it can run
 * this over a fetched sub-graph in its own tests to prove the SQL agrees with
 * the contract. That is the only way two implementations of a graph query stay
 * equal.
 *
 * Guarantees: breadth-first, so the first time a node is reached is by a
 * shortest path; each node appears at most once; cycles terminate.
 */
export function traverseEvidenceGraph(
  edges: readonly EvidenceEdge[],
  start: EvidenceNodeRef,
  options: TraversalOptions,
): readonly TraversalHit[] {
  const maxDepth = Math.max(0, Math.trunc(options.maxDepth));
  const direction = options.direction ?? 'outgoing';
  const allowed = new Set<EvidenceEdgeType>(options.types ?? EVIDENCE_EDGE_TYPES);

  const seen = new Set<string>([formatEvidenceRef(start)]);
  const hits: TraversalHit[] = [{ node: start, depth: 0, path: [] }];
  let frontier: TraversalHit[] = hits.slice();

  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth += 1) {
    const next: TraversalHit[] = [];
    for (const current of frontier) {
      for (const edge of edges) {
        if (!allowed.has(edge.type)) continue;

        let target: EvidenceNodeRef | null = null;
        if (direction !== 'incoming' && sameEvidenceNode(edge.from, current.node)) {
          target = edge.to;
        } else if (direction !== 'outgoing' && sameEvidenceNode(edge.to, current.node)) {
          target = edge.from;
        }
        if (!target) continue;

        const key = formatEvidenceRef(target);
        if (seen.has(key)) continue;
        seen.add(key);
        const hit: TraversalHit = { node: target, depth, path: [...current.path, edge] };
        hits.push(hit);
        next.push(hit);
      }
    }
    frontier = next;
  }

  return Object.freeze(hits);
}

// ---------------------------------------------------------------------------
// What the persistent side must serve
// ---------------------------------------------------------------------------

/** A query the persistent evidence graph must answer, and what it needs to answer it. */
export interface EvidenceGraphQuery {
  readonly id: string;
  /** The question, in the words a reviewer would ask it. */
  readonly question: string;
  readonly direction: TraversalDirection;
  /** `null` when the query is depth-unbounded by nature (single hop). */
  readonly maxDepth: number | null;
  /** Index the query is unservable without. */
  readonly requiresIndex: string;
}

/**
 * The queries that justify the table. The gap is precisely that the current
 * `List<string>` column can serve exactly ONE of these (`dedup-external-id`,
 * by linear scan) and none of the other three at any cost.
 */
export const EVIDENCE_GRAPH_QUERIES: readonly EvidenceGraphQuery[] = Object.freeze([
  Object.freeze({
    id: 'forward-what-does-this-depend-on',
    question: 'What evidence does this subject depend on, one hop out?',
    direction: 'outgoing' as const,
    maxDepth: 1,
    requiresIndex: 'idx_evidence_edges_from',
  }),
  Object.freeze({
    id: 'reverse-what-moved-because-of-this',
    question: 'What moved because of this gate decision / agent turn?',
    direction: 'incoming' as const,
    maxDepth: 1,
    requiresIndex: 'idx_evidence_edges_to',
  }),
  Object.freeze({
    id: 'decision-to-evidence-path',
    question:
      'Which ADR moved because of which gate decision because of which agent turn, for one initiative?',
    direction: 'incoming' as const,
    maxDepth: 3,
    requiresIndex: 'idx_evidence_edges_to',
  }),
  Object.freeze({
    id: 'dedup-external-id',
    question: 'Has this external id already been recorded for this initiative?',
    direction: 'outgoing' as const,
    maxDepth: 1,
    requiresIndex: 'idx_evidence_edges_from',
  }),
]);

/** Column of the specified `evidence_edges` table. */
export interface EvidenceEdgeColumnSpec {
  readonly name: string;
  /** PostgreSQL type. */
  readonly type: string;
  readonly nullable: boolean;
  readonly note: string;
}

/**
 * The `evidence_edges` table specification.
 *
 * NOT built here: the Tracker is a separate repository and owns its schema and
 * its EF migration. This constant is what that migration is written against and
 * reviewed with, and it is deliberately data rather than prose so a Tracker-side
 * test can assert its own model against it after re-pinning this package.
 */
export const EVIDENCE_EDGE_STORAGE_CONTRACT = Object.freeze({
  table: 'evidence_edges',
  owner: 'beyondnetcode/evolith_tracker',
  columns: Object.freeze([
    Object.freeze({ name: 'id', type: 'uuid', nullable: false, note: 'surrogate key' }),
    Object.freeze({ name: 'tenant_id', type: 'uuid', nullable: false, note: 'tenant isolation; every query is scoped by it' }),
    Object.freeze({ name: 'from_kind', type: 'text', nullable: false, note: `one of ${EVIDENCE_NODE_KINDS.join(' | ')}` }),
    Object.freeze({ name: 'from_id', type: 'text', nullable: false, note: 'id unique within from_kind' }),
    Object.freeze({ name: 'edge_type', type: 'text', nullable: false, note: `one of ${EVIDENCE_EDGE_TYPES.join(' | ')}` }),
    Object.freeze({ name: 'to_kind', type: 'text', nullable: false, note: `one of ${EVIDENCE_NODE_KINDS.join(' | ')}` }),
    Object.freeze({ name: 'to_id', type: 'text', nullable: false, note: 'id unique within to_kind' }),
    Object.freeze({ name: 'occurred_at', type: 'timestamptz', nullable: false, note: 'ISO-8601 instant the relation became true' }),
    Object.freeze({ name: 'asserted_by', type: 'text', nullable: true, note: 'evolith-core | tracker user id | agent id' }),
    Object.freeze({ name: 'provenance', type: 'text', nullable: true, note: 'correlation id or migration tag' }),
  ]) as readonly EvidenceEdgeColumnSpec[],
  indexes: Object.freeze([
    Object.freeze({
      name: 'idx_evidence_edges_from',
      columns: Object.freeze(['tenant_id', 'from_kind', 'from_id', 'edge_type']),
      note: 'forward traversal',
    }),
    Object.freeze({
      name: 'idx_evidence_edges_to',
      columns: Object.freeze(['tenant_id', 'to_kind', 'to_id', 'edge_type']),
      note: 'REVERSE traversal — the lookup the jsonb List<string> cannot serve at any cost',
    }),
    Object.freeze({
      name: 'ux_evidence_edges_identity',
      columns: Object.freeze(['tenant_id', 'from_kind', 'from_id', 'edge_type', 'to_kind', 'to_id', 'occurred_at']),
      note: 'unique; mirrors evidenceEdgeKey() so re-assertion is idempotent',
    }),
  ]),
  backfill: Object.freeze({
    source: 'evidence_records.references_json',
    rule: 'edgesFromLegacyReferences(subject, References, record.recordedAt)',
    unmappedEntries:
      'entries that are not canonical evidence:// refs are opaque external ids, are NOT edges, and stay in References',
    retention:
      'References is kept as a read-only projection for one release after the backfill, then removed',
  }),
  endpoint: Object.freeze({
    method: 'GET',
    path: '/api/v1/initiatives/{initiativeId}/evidence-graph',
    query: Object.freeze(['depth (default 2, max 5)', 'direction (outgoing|incoming|both)', 'type (repeatable)']),
    semantics: 'must agree with traverseEvidenceGraph() over the same edge set',
  }),
});
