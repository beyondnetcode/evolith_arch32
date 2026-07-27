/**
 * @file rule-applicability.ts
 * @description GT-571 — decide, BEFORE evaluation, which rules of the Core
 * corpus are addressed to the repository under validation at all.
 *
 * ## The defect this closes
 *
 * `evolith init` followed by `evolith validate` on a brand-new satellite
 * returned ~35 BLOCKING findings. Almost none of them described anything the
 * user had done wrong:
 *
 *  - `CLI-RR-01` "dist/main.js not found — run npm run build in sdk/cli" and
 *    `TAX-05` "Missing top-level directories: sdk, rulesets" are rules about the
 *    **Evolith Core monorepo itself**. They can never pass in a satellite, and a
 *    satellite cannot make them pass;
 *  - `AAI-R*`, `DAM-R*`, `EC-R*`, `ED-R*`, `SV-R*`, `DM-R*`, `MM-R*` are the
 *    rules of eight mutually exclusive topologies, all fired at once against a
 *    repository that has not declared any topology yet;
 *  - `TAX-06`, `DEP-*`, `CB-VAL-01` describe artifacts (a test tree, a pinned
 *    dependency graph, a compliance declaration) that a `phase-0` scaffold has
 *    not reached the lifecycle stage to own.
 *
 * A first-time user reads that as "the tool is broken".
 *
 * ## Not-applicable is NOT skipped (interaction with GT-569)
 *
 * GT-569 made the verdict report its own denominator: `rulesChecked +
 * rulesSkipped + rulesErrored === rulesTotal`, where `skipped` means
 * **unevaluable** — the engine wanted to check the rule and could not. A rule
 * addressed to somebody else is a different thing: it is **not addressed to this
 * repository**, so counting it as `skipped` would inflate the unevaluated
 * fraction and could trip `maxSkippedFraction` for a repo with nothing wrong.
 *
 * The choice made here is a **pre-filter**, not a fourth outcome:
 * non-applicable rules never reach the evaluator, so they are absent from
 * `rulesTotal` and the GT-569 invariant holds unchanged and literally. They are
 * not invisible either — they are reported separately as `rulesNotApplicable` /
 * `notApplicableRuleIds`, over a `corpusTotal` that names the full corpus.
 *
 * ## Defaults are behaviour-preserving
 *
 * Every dimension defaults to "applies". A rule with no `audience` is `both`; a
 * rule with no `topologies` is topology-agnostic; a rule with no
 * `appliesFromSdlcPhase` applies at every phase. An unannotated corpus and an
 * undeclared satellite therefore behave exactly as before GT-571.
 */

import { IConfigParser, IFileSystem } from '../../domain/interfaces';
import { probeRulesetsLocation } from '../paths/rulesets-location';

/** Who a rule is addressed to. */
export type RuleAudience = 'core' | 'satellite' | 'both';

/** The audience of the repository under validation — never `both`. */
export type RepositoryAudience = 'core' | 'satellite';

/** The applicability facts declared for one rule (after ruleset-level defaults). */
export interface RuleApplicability {
  /** Defaults to `'both'`. */
  readonly audience: RuleAudience;
  /**
   * Topology ids this rule belongs to. Absent/empty ⇒ topology-agnostic: the
   * rule applies whatever the repository declares.
   */
  readonly topologies?: readonly string[];
  /**
   * Earliest SDLC phase at which the rule is meaningful (`0` = greenfield
   * scaffold, `1` = Conception … `5` = Delivery). Absent ⇒ every phase.
   */
  readonly appliesFromSdlcPhase?: number;
}

/** What the repository under validation declares about itself. */
export interface ApplicabilityContext {
  readonly audience: RepositoryAudience;
  /** Topologies the repository declares. Empty ⇒ none declared yet. */
  readonly declaredTopologies: readonly string[];
  /**
   * Declared SDLC phase. `undefined` ⇒ the repository does not say, and phase
   * gating is disabled (fail-open: never exclude on a fact nobody stated).
   */
  readonly sdlcPhase?: number;
}

/** Why a rule was excluded before evaluation. */
export type NotApplicableReason = 'audience' | 'topology' | 'sdlc-phase';

/** The permissive default, used for any rule the corpus does not annotate. */
export const DEFAULT_APPLICABILITY: RuleApplicability = Object.freeze({ audience: 'both' });

/**
 * Progressive-axis `metadata.phase` → topology id. The three progressive phases
 * are topologies like any other; the satellite contract just spells them F1/F2/F3.
 */
export const PROGRESSIVE_PHASE_TOPOLOGY: Readonly<Record<string, string>> = Object.freeze({
  F1: 'modular-monolith',
  F2: 'distributed-modules',
  F3: 'microservices',
});

/**
 * Decide whether a rule addresses this repository. Returns the reason it does
 * NOT, or `undefined` when it does.
 *
 * Order is deliberate: audience first (the coarsest and least arguable), then
 * topology, then lifecycle phase — so the reason reported to a user is the most
 * fundamental one.
 */
export function notApplicableReason(
  applicability: RuleApplicability | undefined,
  ctx: ApplicabilityContext,
): NotApplicableReason | undefined {
  const a = applicability ?? DEFAULT_APPLICABILITY;

  const audience = a.audience ?? 'both';
  if (audience !== 'both' && audience !== ctx.audience) return 'audience';

  if (a.topologies && a.topologies.length > 0) {
    const declared = new Set(ctx.declaredTopologies);
    if (!a.topologies.some((t) => declared.has(t))) return 'topology';
  }

  if (
    a.appliesFromSdlcPhase !== undefined &&
    ctx.sdlcPhase !== undefined &&
    ctx.sdlcPhase < a.appliesFromSdlcPhase
  ) {
    return 'sdlc-phase';
  }

  return undefined;
}

/** Human-readable explanation, used in the advisory the verdict carries. */
export function describeNotApplicable(reason: NotApplicableReason): string {
  switch (reason) {
    case 'audience':
      return 'addressed to the Evolith Core monorepo, not to a satellite';
    case 'topology':
      return 'belongs to a topology this repository has not declared';
    case 'sdlc-phase':
      return 'belongs to a later SDLC phase than the one this repository declares';
  }
}

// ---------------------------------------------------------------------------
// Reading the declarations out of a corpus
// ---------------------------------------------------------------------------

function asAudience(raw: unknown): RuleAudience | undefined {
  return raw === 'core' || raw === 'satellite' || raw === 'both' ? raw : undefined;
}

function asTopologies(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.filter((t): t is string => typeof t === 'string' && t.length > 0);
  return list.length > 0 ? list : undefined;
}

function asPhase(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const m = /^(?:phase-)?(\d+)$/i.exec(raw.trim());
    if (m) return Number(m[1]);
  }
  return undefined;
}

/** Extract the applicability facts a ruleset document declares at file level. */
export function readRulesetApplicability(doc: Record<string, unknown>): Partial<RuleApplicability> {
  return {
    audience: asAudience(doc['audience']),
    topologies: asTopologies(doc['topologies']),
    appliesFromSdlcPhase: asPhase(doc['appliesFromSdlcPhase']),
  };
}

/** Merge a per-rule declaration over the ruleset-level default. */
export function mergeApplicability(
  fileLevel: Partial<RuleApplicability>,
  ruleLevel: Partial<RuleApplicability>,
): RuleApplicability {
  return {
    audience: ruleLevel.audience ?? fileLevel.audience ?? 'both',
    topologies: ruleLevel.topologies ?? fileLevel.topologies,
    appliesFromSdlcPhase: ruleLevel.appliesFromSdlcPhase ?? fileLevel.appliesFromSdlcPhase,
  };
}

/**
 * Applicability facts of the whole corpus, keyed by rule id.
 *
 * Rule ids are unique across the Evolith corpus (379 rules, 0 collisions at the
 * time of writing), but the index does not *rely* on that: when two files
 * declare the same id, the entries are merged to the MOST PERMISSIVE reading, so
 * an id collision can only ever cause a rule to be evaluated — never silently
 * dropped.
 */
export class RuleApplicabilityIndex {
  private constructor(private readonly byRuleId: ReadonlyMap<string, RuleApplicability>) {}

  /** An index that annotates nothing — every rule keeps the permissive default. */
  static empty(): RuleApplicabilityIndex {
    return new RuleApplicabilityIndex(new Map());
  }

  static fromEntries(entries: Iterable<readonly [string, RuleApplicability]>): RuleApplicabilityIndex {
    const map = new Map<string, RuleApplicability>();
    for (const [id, applicability] of entries) {
      const existing = map.get(id);
      map.set(id, existing ? widen(existing, applicability) : applicability);
    }
    return new RuleApplicabilityIndex(map);
  }

  /**
   * Scan the ruleset corpus under `corePath` and read every file-level and
   * rule-level applicability declaration.
   *
   * Deliberately tolerant: a corpus that cannot be located, a directory that
   * cannot be listed and a file that cannot be parsed all degrade to "no
   * annotation" (⇒ everything applies). This module must never be the reason a
   * validation fails — {@link DiskRulesetRepository} already owns the hard
   * errors for a missing or corrupt corpus.
   */
  static async load(fs: IFileSystem, corePath: string, sep = '/'): Promise<RuleApplicabilityIndex> {
    let rulesetsRoot: string | undefined;
    try {
      ({ rulesetsRoot } = await probeRulesetsLocation(
        corePath,
        { exists: (p) => fs.exists(p), readdirNames: (p) => fs.readdirNames(p) },
        sep,
      ));
    } catch {
      return RuleApplicabilityIndex.empty();
    }
    if (!rulesetsRoot) return RuleApplicabilityIndex.empty();

    const files = await collectRulesetFiles(fs, rulesetsRoot, sep);
    const entries: Array<readonly [string, RuleApplicability]> = [];

    for (const file of files) {
      let doc: Record<string, unknown>;
      try {
        doc = JSON.parse(await fs.readFile(file)) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (!doc || typeof doc !== 'object') continue;

      const fileLevel = readRulesetApplicability(doc);
      const rawList = [
        ...(Array.isArray(doc['rules']) ? (doc['rules'] as unknown[]) : []),
        ...(Array.isArray(doc['principles']) ? (doc['principles'] as unknown[]) : []),
      ];

      for (const raw of rawList) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Record<string, unknown>;
        const id = r['id'];
        if (typeof id !== 'string' || id.length === 0) continue;
        entries.push([id, mergeApplicability(fileLevel, readRulesetApplicability(r))]);
      }
    }

    return RuleApplicabilityIndex.fromEntries(entries);
  }

  get(ruleId: string): RuleApplicability | undefined {
    return this.byRuleId.get(ruleId);
  }

  get size(): number {
    return this.byRuleId.size;
  }
}

/** Most-permissive merge, used only on an id collision. */
function widen(a: RuleApplicability, b: RuleApplicability): RuleApplicability {
  const audience: RuleAudience = a.audience === b.audience ? a.audience : 'both';
  const topologies =
    a.topologies && b.topologies
      ? Array.from(new Set([...a.topologies, ...b.topologies]))
      : undefined;
  const phases = [a.appliesFromSdlcPhase, b.appliesFromSdlcPhase];
  const appliesFromSdlcPhase = phases.some((p) => p === undefined)
    ? undefined
    : Math.min(...(phases as number[]));
  return { audience, topologies, appliesFromSdlcPhase };
}

/** Recursive `*.rules.json` walk, mirroring the repository's own discovery. */
async function collectRulesetFiles(
  fs: IFileSystem,
  dir: string,
  sep: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 4) return [];
  let entries: string[];
  try {
    entries = await fs.readdirNames(dir);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const full = `${dir}${sep}${entry}`;
    if (entry.endsWith('.rules.json')) {
      files.push(full);
      continue;
    }
    if (entry.includes('.')) continue;
    try {
      const stat = await fs.stat(full);
      if (stat?.isDirectory?.()) files.push(...(await collectRulesetFiles(fs, full, sep, depth + 1)));
    } catch {
      /* unreadable entry — nothing to annotate from it */
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Reading the declarations out of the repository under validation
// ---------------------------------------------------------------------------

/** What a repository declares about itself, independent of manifest shape. */
export interface SatelliteDeclaration {
  /** Explicit `audience`, when the manifest states one. */
  readonly audience?: RepositoryAudience;
  readonly topologies: string[];
  readonly sdlcPhase?: number;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Read the applicability declaration out of a parsed `evolith.yaml`.
 *
 * Two manifest shapes are live in the wild and both must be understood:
 *
 *  - the CANONICAL satellite contract (`apiVersion`/`kind`/`metadata`/`spec`),
 *    with `metadata.phase: F1|F2|F3`, `spec.design.topology.confirmed[]` and
 *    `spec.sdlc.currentPhase: 1..5`;
 *  - the shape `evolith init` actually writes today — `coreRef`/`governance`/
 *    `product`/`tools`, with `product.phase: "phase-0"` and no topology at all.
 *    That second shape is precisely the freshly-initialized repository this gap
 *    is about, so ignoring it would fix nothing.
 */
export function readSatelliteDeclaration(doc: unknown): SatelliteDeclaration {
  const root = record(doc);
  if (!root) return { topologies: [] };

  const metadata = record(root['metadata']);
  const spec = record(root['spec']);
  const product = record(root['product']);

  const audience =
    asAudience(metadata?.['audience']) ?? asAudience(root['audience']) ?? asAudience(product?.['audience']);

  const topologies = new Set<string>();

  const progressive = metadata?.['phase'];
  if (typeof progressive === 'string') {
    const mapped = PROGRESSIVE_PHASE_TOPOLOGY[progressive.toUpperCase()];
    if (mapped) topologies.add(mapped);
  }

  const confirmed = asTopologies(record(record(spec?.['design'])?.['topology'])?.['confirmed']);
  for (const t of confirmed ?? []) topologies.add(t);

  // Forward-compatible with the legacy shape, which has no topology block today.
  for (const t of asTopologies(product?.['topologies']) ?? []) topologies.add(t);

  const sdlcPhase =
    asPhase(record(spec?.['sdlc'])?.['currentPhase']) ??
    // `product.phase` in the legacy shape is the LIFECYCLE phase ("phase-0"),
    // not the progressive-axis phase that `metadata.phase` carries.
    asPhase(product?.['phase']);

  return {
    audience: audience === 'both' ? undefined : audience,
    topologies: [...topologies],
    sdlcPhase,
  };
}

/**
 * Is the repository under validation the Evolith Core monorepo?
 *
 * Two signals, both narrow on purpose:
 *
 *  1. the satellite path IS the core path (`evolith validate --core .` from
 *     inside the Core);
 *  2. the satellite hosts the AUTHORED corpus at `src/rulesets/schema` — the
 *     Core monorepo's signature layout.
 *
 * A content probe of `<satellite>/rulesets` would be wrong here and was
 * rejected: `evolith init --features acl` scaffolds `rulesets/acl/` inside a
 * satellite, and `acl` is a canonical corpus marker — so that probe classifies a
 * brand-new satellite as the Core and re-introduces the exact findings this gap
 * removes.
 */
export async function inferRepositoryAudience(
  fs: IFileSystem,
  satellitePath: string,
  corePath: string,
  sep = '/',
): Promise<RepositoryAudience> {
  if (samePath(satellitePath, corePath, sep)) return 'core';
  try {
    if (await fs.exists(`${trimTrailing(satellitePath, sep)}${sep}src${sep}rulesets${sep}schema`)) {
      return 'core';
    }
  } catch {
    /* unreadable — treat as a satellite, the safe default for a consumer repo */
  }
  return 'satellite';
}

function trimTrailing(p: string, sep: string): string {
  return p.endsWith(sep) ? p.slice(0, -sep.length) : p;
}

function samePath(a: string, b: string, sep: string): boolean {
  return trimTrailing(a, sep) === trimTrailing(b, sep);
}

/**
 * Build the {@link ApplicabilityContext} for a run: read `evolith.yaml` when it
 * is there, fall back to inference, and never throw — a manifest that cannot be
 * read yields the fully permissive context (everything applies), which is the
 * pre-GT-571 behaviour.
 */
export async function resolveApplicabilityContext(
  deps: { fs: IFileSystem; configParser: IConfigParser },
  satellitePath: string,
  corePath: string,
  sep = '/',
): Promise<ApplicabilityContext> {
  let declaration: SatelliteDeclaration = { topologies: [] };
  const manifestPath = `${trimTrailing(satellitePath, sep)}${sep}evolith.yaml`;

  try {
    if (await deps.fs.exists(manifestPath)) {
      declaration = readSatelliteDeclaration(deps.configParser.parse(await deps.fs.readFile(manifestPath)));
    }
  } catch {
    /* unparseable manifest — GOV-000 and the schema rules report it; here it
       simply means "nothing declared", i.e. no rule is filtered out. */
  }

  const audience =
    declaration.audience ?? (await inferRepositoryAudience(deps.fs, satellitePath, corePath, sep));

  return {
    audience,
    declaredTopologies: declaration.topologies,
    sdlcPhase: declaration.sdlcPhase,
  };
}
