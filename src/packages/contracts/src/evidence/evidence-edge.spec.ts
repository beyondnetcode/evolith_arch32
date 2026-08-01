/**
 * GT-605 — the shared evidence-edge contract.
 *
 * These tests are the executable half of the specification: the direction of
 * every edge type, the encoding that makes the Tracker's `List<string>` column
 * migratable, and the depth-bounded traversal semantics both sides must agree
 * on. They fail if any of the three drifts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CORE_NATIVE_EDGE_TYPES,
  EVIDENCE_EDGE_SEMANTICS,
  EVIDENCE_EDGE_STORAGE_CONTRACT,
  EVIDENCE_EDGE_TYPES,
  EVIDENCE_GRAPH_QUERIES,
  EVIDENCE_NODE_KINDS,
  edgesFromLegacyReferences,
  evidenceEdgeKey,
  formatEvidenceRef,
  invertEdge,
  isEvidenceEdgeType,
  isEvidenceNodeKind,
  parseEvidenceRef,
  sameEvidenceNode,
  traverseEvidenceGraph,
  type EvidenceEdge,
  type EvidenceNodeRef,
} from './evidence-edge';

const AT = '2026-07-28T00:00:00.000Z';

const adr: EvidenceNodeRef = { kind: 'adr', id: 'ADR-0101' };
const decision: EvidenceNodeRef = { kind: 'gate-decision', id: 'gd-77' };
const turn: EvidenceNodeRef = { kind: 'agent-turn', id: 'turn-9' };
const unrelated: EvidenceNodeRef = { kind: 'artifact', id: 'docs/prd.md' };

const edge = (from: EvidenceNodeRef, to: EvidenceNodeRef, type: EvidenceEdge['type']): EvidenceEdge => ({
  from,
  to,
  type,
  occurredAt: AT,
});

/** The chain the gap is named after: ADR ← gate decision ← agent turn. */
const CAUSAL_CHAIN: readonly EvidenceEdge[] = [
  edge(adr, decision, 'caused_by'),
  edge(decision, turn, 'caused_by'),
  edge(unrelated, adr, 'requires'),
];

describe('the edge vocabulary (GT-605)', () => {
  it('is a strict superset of the Core model, so adopting it never breaks the Core', () => {
    for (const t of CORE_NATIVE_EDGE_TYPES) {
      expect(EVIDENCE_EDGE_TYPES).toContain(t);
    }
    // …and it adds exactly the causal edge, which is the one the audit question needs.
    expect([...EVIDENCE_EDGE_TYPES].filter((t) => !(CORE_NATIVE_EDGE_TYPES as readonly string[]).includes(t)))
      .toEqual(['caused_by']);
  });

  it('fixes the direction of every type, so two implementations cannot swap the ends', () => {
    for (const t of EVIDENCE_EDGE_TYPES) {
      const sem = EVIDENCE_EDGE_SEMANTICS[t];
      expect(sem).toBeDefined();
      expect(sem.reading).toContain('{from}');
      expect(sem.reading).toContain('{to}');
      expect(sem.inverseReading).toContain('{from}');
      expect(sem.inverseReading).toContain('{to}');
      // The two readings are genuinely different sentences, not a copy.
      expect(sem.inverseReading).not.toEqual(sem.reading);
    }
  });

  it('recognises its own vocabulary and rejects anything else', () => {
    expect(isEvidenceEdgeType('caused_by')).toBe(true);
    expect(isEvidenceEdgeType('references')).toBe(false);
    expect(isEvidenceNodeKind('agent-turn')).toBe(true);
    expect(isEvidenceNodeKind('anything')).toBe(false);
  });

  it('inverting an edge swaps the ends and preserves the type', () => {
    const e = edge(adr, decision, 'caused_by');
    const inverted = invertEdge(e);
    expect(sameEvidenceNode(inverted.from, decision)).toBe(true);
    expect(sameEvidenceNode(inverted.to, adr)).toBe(true);
    expect(inverted.type).toBe('caused_by');
  });

  it('edge identity ignores who asserted it but not when it happened', () => {
    const base = edge(adr, decision, 'caused_by');
    expect(evidenceEdgeKey({ ...base, assertedBy: 'a', provenance: 'p' })).toBe(evidenceEdgeKey(base));
    expect(evidenceEdgeKey({ ...base, occurredAt: '2026-07-29T00:00:00.000Z' })).not.toBe(evidenceEdgeKey(base));
  });
});

describe('the canonical node encoding', () => {
  it('round-trips every node kind', () => {
    for (const kind of EVIDENCE_NODE_KINDS) {
      const ref = { kind, id: 'x/y-1' } as EvidenceNodeRef;
      expect(parseEvidenceRef(formatEvidenceRef(ref))).toEqual(ref);
    }
  });

  it('keeps ids containing slashes intact (artifact ids are paths)', () => {
    const ref: EvidenceNodeRef = { kind: 'artifact', id: 'docs/adrs/ADR-0101.md' };
    expect(formatEvidenceRef(ref)).toBe('evidence://artifact/docs/adrs/ADR-0101.md');
    expect(parseEvidenceRef(formatEvidenceRef(ref))).toEqual(ref);
  });

  it('rejects non-canonical strings instead of guessing — this is what keeps external ids safe', () => {
    for (const bad of ['JIRA-123', '', 'evidence://', 'evidence://unknown-kind/x', 'evidence://adr/', 'http://x/y']) {
      expect(parseEvidenceRef(bad)).toBeNull();
    }
    expect(parseEvidenceRef(null)).toBeNull();
    expect(parseEvidenceRef(undefined)).toBeNull();
  });
});

describe('backfill from the Tracker List<string> column', () => {
  const subject: EvidenceNodeRef = { kind: 'evidence-record', id: 'ev-1' };

  it('maps canonical references to typed edges and leaves external ids unmapped', () => {
    const mappings = edgesFromLegacyReferences(
      subject,
      [formatEvidenceRef(adr), 'JIRA-4412', formatEvidenceRef(decision)],
      AT,
    );

    expect(mappings).toHaveLength(3);
    expect(mappings[0].edge).toMatchObject({ from: subject, to: adr, type: 'validates', occurredAt: AT });
    expect(mappings[1].edge).toBeNull();
    expect(mappings[1].reference).toBe('JIRA-4412');
    expect(mappings[2].edge).toMatchObject({ to: decision, type: 'validates' });

    // The two sets are disjoint — which is exactly why `References` must survive
    // one release as a projection rather than be dropped with the migration.
    const unmapped = mappings.filter((m) => m.edge === null).map((m) => m.reference);
    expect(unmapped).toEqual(['JIRA-4412']);
  });

  it('tolerates a null/absent column', () => {
    expect(edgesFromLegacyReferences(subject, null, AT)).toEqual([]);
    expect(edgesFromLegacyReferences(subject, undefined, AT)).toEqual([]);
  });

  it('stamps a migration provenance so backfilled edges are distinguishable from asserted ones', () => {
    const [m] = edgesFromLegacyReferences(subject, [formatEvidenceRef(adr)], AT);
    expect(m.edge?.provenance).toBe('backfill:ReferencesJson');
  });
});

describe('the depth-bounded traversal', () => {
  it('answers the question the gap is named after', () => {
    // "Which ADR moved because of which gate decision because of which agent turn"
    const hits = traverseEvidenceGraph(CAUSAL_CHAIN, adr, {
      maxDepth: 2,
      direction: 'outgoing',
      types: ['caused_by'],
    });

    expect(hits.map((h) => h.node.id)).toEqual(['ADR-0101', 'gd-77', 'turn-9']);
    expect(hits.map((h) => h.depth)).toEqual([0, 1, 2]);
    // The full causal path is returned, not just the endpoint.
    expect(hits[2].path.map((e) => `${e.from.id}->${e.to.id}`)).toEqual(['ADR-0101->gd-77', 'gd-77->turn-9']);
  });

  it('honours the depth bound — an unbounded walk over an append-only ledger is the defect', () => {
    const hits = traverseEvidenceGraph(CAUSAL_CHAIN, adr, { maxDepth: 1, types: ['caused_by'] });
    expect(hits.map((h) => h.node.id)).toEqual(['ADR-0101', 'gd-77']);

    expect(traverseEvidenceGraph(CAUSAL_CHAIN, adr, { maxDepth: 0 })).toHaveLength(1);
    // A negative bound cannot widen the walk.
    expect(traverseEvidenceGraph(CAUSAL_CHAIN, adr, { maxDepth: -5 })).toHaveLength(1);
  });

  it('walks against the edges — the reverse lookup the jsonb column cannot serve', () => {
    const hits = traverseEvidenceGraph(CAUSAL_CHAIN, turn, {
      maxDepth: 2,
      direction: 'incoming',
      types: ['caused_by'],
    });
    expect(hits.map((h) => h.node.id)).toEqual(['turn-9', 'gd-77', 'ADR-0101']);
  });

  it('filters by edge type', () => {
    const all = traverseEvidenceGraph(CAUSAL_CHAIN, adr, { maxDepth: 3, direction: 'both' });
    expect(all.map((h) => h.node.id).sort()).toEqual(['ADR-0101', 'docs/prd.md', 'gd-77', 'turn-9']);

    const causalOnly = traverseEvidenceGraph(CAUSAL_CHAIN, adr, { maxDepth: 3, direction: 'both', types: ['caused_by'] });
    expect(causalOnly.map((h) => h.node.id)).not.toContain('docs/prd.md');
  });

  it('terminates on cycles and reports each node once, by a shortest path', () => {
    const a: EvidenceNodeRef = { kind: 'adr', id: 'A' };
    const b: EvidenceNodeRef = { kind: 'adr', id: 'B' };
    const c: EvidenceNodeRef = { kind: 'adr', id: 'C' };
    const cyclic = [edge(a, b, 'requires'), edge(b, c, 'requires'), edge(c, a, 'requires'), edge(a, c, 'requires')];

    const hits = traverseEvidenceGraph(cyclic, a, { maxDepth: 10 });
    expect(hits.map((h) => h.node.id)).toEqual(['A', 'B', 'C']);
    // C is reachable at depth 2 via B and at depth 1 directly: BFS must report 1.
    expect(hits.find((h) => h.node.id === 'C')!.depth).toBe(1);
  });

  it('returns only the start node for a node with no edges', () => {
    const orphan: EvidenceNodeRef = { kind: 'initiative', id: 'INI-0' };
    expect(traverseEvidenceGraph(CAUSAL_CHAIN, orphan, { maxDepth: 5, direction: 'both' })).toEqual([
      { node: orphan, depth: 0, path: [] },
    ]);
  });
});

describe('the storage specification handed to the Tracker', () => {
  it('names every query the persistent side must serve, with the index that serves it', () => {
    const ids = EVIDENCE_GRAPH_QUERIES.map((q) => q.id);
    expect(ids).toContain('reverse-what-moved-because-of-this');
    expect(ids).toContain('decision-to-evidence-path');

    const indexNames = EVIDENCE_EDGE_STORAGE_CONTRACT.indexes.map((i) => i.name);
    for (const q of EVIDENCE_GRAPH_QUERIES) {
      expect(indexNames).toContain(q.requiresIndex);
    }
  });

  it('indexes BOTH directions — the single-direction jsonb column is the gap', () => {
    const byName = new Map(EVIDENCE_EDGE_STORAGE_CONTRACT.indexes.map((i) => [i.name, i.columns]));
    expect(byName.get('idx_evidence_edges_from')).toEqual(['tenant_id', 'from_kind', 'from_id', 'edge_type']);
    expect(byName.get('idx_evidence_edges_to')).toEqual(['tenant_id', 'to_kind', 'to_id', 'edge_type']);
  });

  it('the uniqueness constraint mirrors the in-memory edge identity', () => {
    const ux = EVIDENCE_EDGE_STORAGE_CONTRACT.indexes.find((i) => i.name === 'ux_evidence_edges_identity')!;
    // evidenceEdgeKey() = from | type | to | occurredAt — the same tuple, tenant-scoped.
    expect([...ux.columns]).toEqual([
      'tenant_id',
      'from_kind',
      'from_id',
      'edge_type',
      'to_kind',
      'to_id',
      'occurred_at',
    ]);
  });

  it('every column carrying a closed vocabulary documents that vocabulary', () => {
    const cols = new Map(EVIDENCE_EDGE_STORAGE_CONTRACT.columns.map((c) => [c.name, c.note]));
    for (const kind of EVIDENCE_NODE_KINDS) {
      expect(cols.get('from_kind')).toContain(kind);
      expect(cols.get('to_kind')).toContain(kind);
    }
    for (const type of EVIDENCE_EDGE_TYPES) {
      expect(cols.get('edge_type')).toContain(type);
    }
  });

  it('keeps References for one release, because unmapped external ids live only there', () => {
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.backfill.retention).toMatch(/one release/i);
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.backfill.unmappedEntries).toMatch(/stay in References/i);
  });

  it('declares the depth-bounded endpoint and binds its semantics to the shared traversal', () => {
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.endpoint.path).toContain('evidence-graph');
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.endpoint.semantics).toContain('traverseEvidenceGraph');
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.endpoint.query.join(' ')).toMatch(/depth/);
  });

  it('is owned by the Tracker repository, not this one', () => {
    expect(EVIDENCE_EDGE_STORAGE_CONTRACT.owner).toBe('beyondnetcode/evolith_tracker');
  });
});

/**
 * The published JSON Schema is the ONLY form of this contract a non-TypeScript
 * consumer can reach: per core/ADR-T-038 the Tracker is .NET and cannot import
 * this package. That makes the schema file a second copy of the vocabulary, and
 * a second copy is how the two evidence graphs diverged in the first place.
 *
 * These tests are what stops it happening again. They read the shipped file and
 * assert it against the TypeScript constants, so adding an edge type or a node
 * kind here and forgetting the schema fails the build — instead of shipping a
 * Tracker that silently rejects an edge the Core considers valid.
 */
describe('evidence-edge.schema.json mirrors the TypeScript contract', () => {
  const schema = JSON.parse(
    readFileSync(
      join(__dirname, '../../../../rulesets/schema/evidence-edge.schema.json'),
      'utf8',
    ),
  );

  it('publishes the SAME closed node vocabulary, in the same order', () => {
    expect(schema.definitions.nodeRef.properties.kind.enum).toEqual([...EVIDENCE_NODE_KINDS]);
  });

  it('publishes the SAME edge vocabulary, in the same order', () => {
    expect(schema.properties.type.enum).toEqual([...EVIDENCE_EDGE_TYPES]);
  });

  it('keeps the Core native three first, so adoption stays a widening', () => {
    expect(schema.properties.type.enum.slice(0, CORE_NATIVE_EDGE_TYPES.length)).toEqual([
      ...CORE_NATIVE_EDGE_TYPES,
    ]);
  });

  it('requires exactly the fields that form an edge identity', () => {
    // `assertedBy` and `provenance` are metadata ABOUT the claim; requiring them
    // would make an edge unassertable by a producer that legitimately knows
    // neither, and `evidenceEdgeKey` already excludes them.
    expect(schema.required.sort()).toEqual(['from', 'occurredAt', 'to', 'type']);
  });

  it('closes the object, so an unknown field is a rejection and not a silent drop', () => {
    expect(schema.additionalProperties).toBe(false);
    expect(schema.definitions.nodeRef.additionalProperties).toBe(false);
  });

  it('validates a real edge produced by the backfill function', () => {
    const [mapping] = edgesFromLegacyReferences(
      { kind: 'evidence-record', id: 'rec-1' },
      ['evidence://adr/ADR-0101'],
      '2026-08-01T00:00:00.000Z',
    );
    const edge = mapping.edge!;

    // Every required key present, every enum value inside the published sets.
    for (const key of schema.required) {
      expect(edge).toHaveProperty(key);
    }
    expect(schema.properties.type.enum).toContain(edge.type);
    expect(schema.definitions.nodeRef.properties.kind.enum).toContain(edge.from.kind);
    expect(schema.definitions.nodeRef.properties.kind.enum).toContain(edge.to.kind);

    // And no key the schema would reject.
    const allowed = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(edge)) {
      expect(allowed).toContain(key);
    }
  });
});
