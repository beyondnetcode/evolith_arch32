/**
 * Canonical structural fact base — `RepoFacts` (GT-589 · ADR-0101 · ADR-0111).
 *
 * The SINGLE type the stateless Core sees when a consumer wants the
 * `architecture` evaluation to reason about *structure* rather than about text.
 * It enters the {@link EvaluationContext} **inline**, exactly as source files
 * enter via the repository-access / `OverlayFileSystem` precedent (ADR-0080) and
 * exactly as quality signals enter via `Evidence` (ADR-0111 §2).
 *
 * Layering: PURE. This module declares shapes and pure queries over them and
 * nothing else — no filesystem, no process, no clock, no crypto. **Extraction is
 * an orchestration concern that happens OUTSIDE the Core** (see
 * `@beyondnet/evolith-repo-facts`, which drives the TypeScript compiler API /
 * a SCIP indexer / tree-sitter and emits this shape). The Core NEVER invokes an
 * indexer, never opens a repository and holds nothing between evaluations: give
 * it the same `RepoFacts` twice and it answers the same thing twice, which is the
 * whole point of {@link canonicalizeRepoFacts}.
 *
 * Why a fact base and not more `Violation`s: the OSS-enforcer seam (GT-514/515/521)
 * already returns a flat `Violation[]` per tool run. A flat list answers exactly the
 * questions the tool that produced it was configured to ask, and no others. A fact
 * base is *queryable*: the module graph and the symbol graph are here, so a ruleset
 * can ask a question nobody compiled a rule for — for instance whether a symbol is
 * reachable across a boundary through a chain in which **every individual import is
 * legal** ({@link findSymbolBoundaryCrossings}), which no pairwise import check can
 * express because no single edge of that chain is a violation.
 *
 * `contentHash` is OPAQUE to the Core, deliberately. The Core does not recompute it
 * (that would require a hash primitive and would make this module impure); it echoes
 * it as provenance, precisely as it treats `Provenance.artifactHash` on `Evidence`.
 * Reproducibility is a property of purity plus a stable input, and the hash is the
 * name of that input.
 */

/** Schema version of this contract (bumped only on incompatible changes). */
export const REPO_FACTS_SCHEMA_VERSION = '1.0.0';

/** Kind of a declared symbol, in the smallest vocabulary every indexer can fill. */
export type SymbolFactKind =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'variable'
  | 'type'
  | 'enum'
  | 'unknown';

/**
 * Who extracted these facts and with what. Mandatory, for the same reason
 * `Provenance` is mandatory on `Evidence`: a fact whose origin is unknown cannot
 * be audited, and a structural verdict is only as trustworthy as its indexer.
 *
 * `extractedAt` is deliberately EXCLUDED from {@link canonicalizeRepoFacts} — a
 * timestamp is not a structural fact, and letting it into the canonical form would
 * make two indexings of the same tree hash differently.
 */
export interface RepoFactsProvenance {
  /** Extractor package that produced the facts (e.g. 'evolith-repo-facts'). */
  readonly extractedBy: string;
  readonly extractorVersion: string;
  /** Indexer behind the extractor (e.g. 'typescript-compiler-api', 'scip-typescript'). */
  readonly indexer: string;
  readonly indexerVersion: string;
  /** ISO-8601 instant of extraction. NOT part of the canonical form. */
  readonly extractedAt: string;
  /** Revision the facts were extracted from, when the extractor knows it. */
  readonly revision?: string;
}

/** One module (compilation unit). `id` is a repo-relative POSIX path. */
export interface ModuleFact {
  readonly id: string;
  /** Architectural layer the consumer assigns to the module, when it assigns one. */
  readonly layer?: string;
}

/** One module→module import edge. */
export interface ImportFact {
  readonly from: string;
  readonly to: string;
  /** True for `import type` / type-only edges (erased at runtime). */
  readonly typeOnly: boolean;
}

/**
 * One declared symbol. `id` is SCIP-shaped — `<moduleId>#<name>` — so an id is
 * stable across runs and readable in a verdict without a symbol table.
 */
export interface SymbolFact {
  readonly id: string;
  readonly name: string;
  readonly kind: SymbolFactKind;
  readonly moduleId: string;
  readonly exported: boolean;
}

/** One symbol→symbol reference edge (a use of `toSymbol` inside `fromSymbol`). */
export interface ReferenceFact {
  readonly fromSymbol: string;
  readonly toSymbol: string;
}

/** The structural fact base a consumer delivers inline on the EvaluationContext. */
export interface RepoFacts {
  readonly schemaVersion: string;
  /**
   * Digest of {@link canonicalizeRepoFacts} computed by the EXTRACTOR. Opaque to
   * the Core: echoed as provenance, never recomputed, never interpreted.
   */
  readonly contentHash: string;
  readonly provenance: RepoFactsProvenance;
  readonly modules: readonly ModuleFact[];
  readonly imports: readonly ImportFact[];
  readonly symbols: readonly SymbolFact[];
  readonly references: readonly ReferenceFact[];
}

/**
 * A boundary the consumer declares over SYMBOLS, not over files.
 *
 * This is policy, so it travels on the context (`ArchitectureContext`) and not on
 * the facts. `fromModules` / `forbiddenSymbolModules` accept a glob subset: `*`
 * matches within one path segment, `**` matches across segments.
 */
export interface SymbolBoundaryRule {
  readonly id: string;
  /** Modules that constitute the calling boundary (e.g. the CLI surface). */
  readonly fromModules: readonly string[];
  /** Modules whose symbols that boundary must not reach. */
  readonly forbiddenSymbolModules: readonly string[];
  readonly severity?: 'error' | 'warning';
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Canonical form (the input a content hash names)
// ---------------------------------------------------------------------------

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Deterministic serialization of the STRUCTURE only.
 *
 * Every collection is sorted, every record is emitted as a positional tuple (so no
 * key-order ambiguity is possible), and the volatile parts — `contentHash` itself,
 * and `provenance.extractedAt` — are excluded. Two indexings of the same tree
 * therefore produce byte-identical output regardless of file-walk order, which is
 * what makes a content hash over this string meaningful.
 */
export function canonicalizeRepoFacts(facts: RepoFacts): string {
  const modules = [...facts.modules]
    .sort((a, b) => byString(a.id, b.id))
    .map((m) => [m.id, m.layer ?? null]);
  const imports = [...facts.imports]
    .sort((a, b) => byString(a.from, b.from) || byString(a.to, b.to) || Number(a.typeOnly) - Number(b.typeOnly))
    .map((i) => [i.from, i.to, i.typeOnly]);
  const symbols = [...facts.symbols]
    .sort((a, b) => byString(a.id, b.id))
    .map((s) => [s.id, s.name, s.kind, s.moduleId, s.exported]);
  const references = [...facts.references]
    .sort((a, b) => byString(a.fromSymbol, b.fromSymbol) || byString(a.toSymbol, b.toSymbol))
    .map((r) => [r.fromSymbol, r.toSymbol]);

  return JSON.stringify({
    schemaVersion: facts.schemaVersion,
    indexer: facts.provenance.indexer,
    indexerVersion: facts.provenance.indexerVersion,
    modules,
    imports,
    symbols,
    references,
  });
}

/** Glob subset used by {@link SymbolBoundaryRule}: `**` spans segments, `*` does not. */
export function matchesModulePattern(moduleId: string, pattern: string): boolean {
  let rx = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        rx += '.*';
        i += 1;
      } else {
        rx += '[^/]*';
      }
    } else if ('.+^${}()|[]\\?'.includes(ch)) {
      rx += `\\${ch}`;
    } else {
      rx += ch;
    }
  }
  return new RegExp(`^${rx}$`).test(moduleId);
}

const matchesAny = (moduleId: string, patterns: readonly string[]): boolean =>
  patterns.some((p) => matchesModulePattern(moduleId, p));

// ---------------------------------------------------------------------------
// Query 1 — module import cycles (with the concrete chain, not just a flag)
// ---------------------------------------------------------------------------

/** A genuine cyclic import chain. `chain` is closed: its last element repeats the first. */
export interface ImportCycle {
  /** The concrete cycle, e.g. `['a.ts','b.ts','c.ts','a.ts']`. */
  readonly chain: readonly string[];
  /** Every module in the strongly connected component the cycle belongs to. */
  readonly component: readonly string[];
  /** True when every edge of the chain is type-only (erased at runtime). */
  readonly typeOnly: boolean;
}

interface Adjacency {
  readonly nodes: readonly string[];
  readonly out: ReadonlyMap<string, readonly string[]>;
  readonly typeOnlyEdge: ReadonlySet<string>;
}

/** Key of a module→module edge. Module ids are POSIX paths, so ` ` never occurs in one. */
const edgeKey = (from: string, to: string): string => from + ' ' + to;

function buildModuleGraph(facts: RepoFacts): Adjacency {
  const known = new Set(facts.modules.map((m) => m.id));
  const out = new Map<string, string[]>();
  // An edge counts as type-only only when EVERY import record for it is type-only:
  // one runtime import is enough to make the dependency real.
  const typeOnlyByEdge = new Map<string, boolean>();
  for (const id of known) out.set(id, []);
  for (const edge of facts.imports) {
    if (!known.has(edge.from) || !known.has(edge.to)) continue;
    const list = out.get(edge.from);
    if (list && !list.includes(edge.to)) list.push(edge.to);
    const key = edgeKey(edge.from, edge.to);
    typeOnlyByEdge.set(key, (typeOnlyByEdge.get(key) ?? true) && edge.typeOnly);
  }
  for (const list of out.values()) list.sort(byString);
  const typeOnlyEdge = new Set<string>();
  for (const [key, isTypeOnly] of typeOnlyByEdge) if (isTypeOnly) typeOnlyEdge.add(key);
  return { nodes: [...known].sort(byString), out, typeOnlyEdge };
}

/** Shortest cycle through `start`, found by BFS inside `allowed`. Deterministic. */
function shortestCycleThrough(
  start: string,
  graph: Adjacency,
  allowed: ReadonlySet<string>,
): readonly string[] | undefined {
  const prev = new Map<string, string>();
  const queue: string[] = [start];
  const seen = new Set<string>([start]);
  while (queue.length > 0) {
    const node = queue.shift() as string;
    for (const next of graph.out.get(node) ?? []) {
      if (!allowed.has(next)) continue;
      if (next === start) {
        const chain: string[] = [node];
        let cursor = node;
        while (cursor !== start) {
          cursor = prev.get(cursor) as string;
          chain.unshift(cursor);
        }
        return [...chain, start];
      }
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, node);
      queue.push(next);
    }
  }
  return undefined;
}

/**
 * Every genuine cyclic import chain in the module graph.
 *
 * Tarjan's SCC over the module graph, then one shortest concrete chain per
 * component (through the component's lexicographically smallest module) so the
 * finding can NAME the cycle instead of asserting that one exists. Results are
 * ordered by that smallest module, so the output is stable across runs.
 */
export function findImportCycles(facts: RepoFacts): readonly ImportCycle[] {
  const graph = buildModuleGraph(facts);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  // Iterative Tarjan (an explicit stack — repositories are deeper than the JS one).
  for (const root of graph.nodes) {
    if (index.has(root)) continue;
    const work: { node: string; edge: number }[] = [{ node: root, edge: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const neighbours = graph.out.get(frame.node) ?? [];
      if (frame.edge < neighbours.length) {
        const next = neighbours[frame.edge];
        frame.edge += 1;
        if (!index.has(next)) {
          index.set(next, counter);
          low.set(next, counter);
          counter += 1;
          stack.push(next);
          onStack.add(next);
          work.push({ node: next, edge: 0 });
        } else if (onStack.has(next)) {
          low.set(frame.node, Math.min(low.get(frame.node) as number, index.get(next) as number));
        }
      } else {
        work.pop();
        if (work.length > 0) {
          const parent = work[work.length - 1].node;
          low.set(parent, Math.min(low.get(parent) as number, low.get(frame.node) as number));
        }
        if (low.get(frame.node) === index.get(frame.node)) {
          const component: string[] = [];
          for (;;) {
            const member = stack.pop() as string;
            onStack.delete(member);
            component.push(member);
            if (member === frame.node) break;
          }
          components.push(component.sort(byString));
        }
      }
    }
  }

  const cycles: ImportCycle[] = [];
  for (const component of components) {
    const selfLoop = component.length === 1 && (graph.out.get(component[0]) ?? []).includes(component[0]);
    if (component.length < 2 && !selfLoop) continue;
    const allowed = new Set(component);
    const chain = selfLoop ? [component[0], component[0]] : shortestCycleThrough(component[0], graph, allowed);
    if (!chain) continue;
    const typeOnly = chain
      .slice(0, -1)
      .every((from, i) => graph.typeOnlyEdge.has(edgeKey(from, chain[i + 1])));
    cycles.push({ chain, component, typeOnly });
  }
  return cycles.sort((a, b) => byString(a.component[0], b.component[0]));
}

// ---------------------------------------------------------------------------
// Query 2 — symbol reachable across a boundary through individually-legal imports
// ---------------------------------------------------------------------------

/** One symbol that a declared boundary reaches, and the exact chain that reaches it. */
export interface SymbolBoundaryCrossing {
  readonly ruleId: string;
  /** Symbol inside the boundary from which the chain starts. */
  readonly fromSymbol: string;
  /** Forbidden symbol the chain arrives at. */
  readonly toSymbol: string;
  /** The full symbol chain, first element `fromSymbol`, last `toSymbol`. */
  readonly symbolChain: readonly string[];
  /** The modules the chain traverses, consecutive duplicates collapsed. */
  readonly moduleChain: readonly string[];
  /**
   * True when NO module→module import edge exists directly from the first module
   * to the last one — i.e. every import on the way is legal in isolation and no
   * pairwise import check (ESLint boundaries, dependency-cruiser `from`/`to`)
   * can express this crossing.
   */
  readonly viaLegalImportsOnly: boolean;
  readonly severity: 'error' | 'warning';
}

/**
 * Which forbidden symbols a declared boundary can actually reach, and how.
 *
 * Multi-source BFS over the symbol reference graph, from every symbol declared
 * inside `fromModules` to every symbol declared inside `forbiddenSymbolModules`,
 * with predecessor tracking so each crossing carries the shortest concrete chain.
 * Sources are visited in sorted order and each target is reported once, so two runs
 * over the same facts produce the same crossings in the same order.
 *
 * This is the question the flat `Violation[]` of the enforcer seam cannot pose:
 * import checks are file-to-file and pairwise, so a chain whose every edge is legal
 * is invisible to them, and a symbol is not a file.
 */
export function findSymbolBoundaryCrossings(
  facts: RepoFacts,
  rules: readonly SymbolBoundaryRule[],
): readonly SymbolBoundaryCrossing[] {
  if (rules.length === 0 || facts.symbols.length === 0) return [];

  const moduleOf = new Map<string, string>();
  for (const symbol of facts.symbols) moduleOf.set(symbol.id, symbol.moduleId);

  const out = new Map<string, string[]>();
  for (const ref of facts.references) {
    if (!moduleOf.has(ref.fromSymbol) || !moduleOf.has(ref.toSymbol)) continue;
    const list = out.get(ref.fromSymbol);
    if (list) {
      if (!list.includes(ref.toSymbol)) list.push(ref.toSymbol);
    } else {
      out.set(ref.fromSymbol, [ref.toSymbol]);
    }
  }
  for (const list of out.values()) list.sort(byString);

  const directImports = new Set(facts.imports.map((i) => edgeKey(i.from, i.to)));
  const crossings: SymbolBoundaryCrossing[] = [];

  for (const rule of [...rules].sort((a, b) => byString(a.id, b.id))) {
    const sources = facts.symbols
      .filter((s) => matchesAny(s.moduleId, rule.fromModules))
      .map((s) => s.id)
      .sort(byString);
    const forbidden = new Set(
      facts.symbols.filter((s) => matchesAny(s.moduleId, rule.forbiddenSymbolModules)).map((s) => s.id),
    );
    if (sources.length === 0 || forbidden.size === 0) continue;

    const prev = new Map<string, string>();
    const origin = new Map<string, string>();
    const seen = new Set<string>(sources);
    for (const source of sources) origin.set(source, source);
    const queue = [...sources];
    const reached = new Map<string, string>(); // forbidden symbol -> discovering node

    while (queue.length > 0) {
      const node = queue.shift() as string;
      for (const next of out.get(node) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        prev.set(next, node);
        origin.set(next, origin.get(node) as string);
        if (forbidden.has(next)) {
          reached.set(next, node);
          continue; // a forbidden symbol terminates the chain; do not traverse through it
        }
        queue.push(next);
      }
    }

    for (const target of [...reached.keys()].sort(byString)) {
      const symbolChain: string[] = [target];
      let cursor = target;
      while (prev.has(cursor)) {
        cursor = prev.get(cursor) as string;
        symbolChain.unshift(cursor);
      }
      const moduleChain: string[] = [];
      for (const symbolId of symbolChain) {
        const mod = moduleOf.get(symbolId) as string;
        if (moduleChain[moduleChain.length - 1] !== mod) moduleChain.push(mod);
      }
      crossings.push({
        ruleId: rule.id,
        fromSymbol: symbolChain[0],
        toSymbol: target,
        symbolChain,
        moduleChain,
        viaLegalImportsOnly:
          moduleChain.length > 2 &&
          !directImports.has(edgeKey(moduleChain[0], moduleChain[moduleChain.length - 1])),
        severity: rule.severity ?? 'error',
      });
    }
  }

  return crossings;
}

// ---------------------------------------------------------------------------
// The summary the architecture evaluator publishes
// ---------------------------------------------------------------------------

/** What the `architecture` evaluator reports after querying the fact base. */
export interface StructuralFactsSummary {
  /** Echoed extractor digest — the NAME of the input this verdict judged. */
  readonly contentHash: string;
  readonly indexer: string;
  readonly moduleCount: number;
  readonly importCount: number;
  readonly symbolCount: number;
  readonly referenceCount: number;
  readonly cycles: readonly ImportCycle[];
  readonly boundaryCrossings: readonly SymbolBoundaryCrossing[];
}

/** Human-readable rendering of a cyclic chain. */
export const renderChain = (chain: readonly string[]): string => chain.join(' → ');

/**
 * Run every structural query over a fact base. PURE and total: same facts in,
 * same summary out, no I/O, no clock, nothing retained.
 */
export function summarizeRepoFacts(
  facts: RepoFacts,
  boundaries: readonly SymbolBoundaryRule[] = [],
): StructuralFactsSummary {
  return {
    contentHash: facts.contentHash,
    indexer: facts.provenance.indexer,
    moduleCount: facts.modules.length,
    importCount: facts.imports.length,
    symbolCount: facts.symbols.length,
    referenceCount: facts.references.length,
    cycles: findImportCycles(facts),
    boundaryCrossings: findSymbolBoundaryCrossings(facts, boundaries),
  };
}
