import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/** Whether a PAT record prescribes a solution or prohibits a practice. */
export type PatternKind = 'pattern' | 'anti-pattern';

/** Primary concern a canonical pattern addresses (pattern.schema.json `category`). */
export type PatternCategory =
  | 'data-ownership'
  | 'contracts'
  | 'resilience'
  | 'integration'
  | 'governance'
  | 'structure'
  | 'observability'
  | 'security'
  | 'ai-safety'
  | 'delivery';

/** Governance status of a PAT record. */
export type PatternStatus = 'draft' | 'proposed' | 'accepted' | 'deprecated' | 'superseded';

/** Strength of a pattern's applicability inside one topology. */
export type PatternApplicability = 'required' | 'recommended' | 'optional' | 'not-applicable';

/** Per-topology applicability entry (`appliesTo[]`). */
export interface PatternApplication {
  topology: string;
  applicability: PatternApplicability;
  guidance: string;
}

/** A rule that already enforces the pattern (`enforcedBy[]`) — what makes a PAT machine-checkable. */
export interface PatternEnforcement {
  ruleId: string;
  engine: 'topology-ruleset' | 'adr-ruleset' | 'acl-ruleset' | 'cross-cutting-ruleset' | 'opa' | 'ci-guard';
  ruleset?: string;
  statement?: string;
  threshold?: string;
}

/** ADR governing the pattern, carrying an explicit verification status (`governedBy[]`). */
export interface PatternGovernance {
  adr: string;
  track?: 'core' | 'nodejs' | 'dotnet' | 'android' | 'ai-augmented';
  title?: string;
  href?: string;
  verification: 'verified' | 'asserted' | 'refuted';
  verifiedOn?: string;
  note?: string;
}

/** Typed link to another canonical pattern (`relationships[]`). */
export interface PatternRelationship {
  type: 'complements' | 'requires' | 'conflictsWith' | 'variantOf' | 'supersedes';
  target: string;
  note?: string;
}

/** Named realisation of the same invariant at another granularity (`variants[]`). */
export interface PatternVariant {
  name: string;
  scope: 'module' | 'bounded-context' | 'service' | 'domain' | 'product' | 'cluster';
  invariant: string;
  patternRef?: string;
  notes?: string;
}

/** Runtime-specific Canonical Pattern implementing a PAT (`implementations[]`). */
export interface PatternImplementation {
  id: string;
  runtime: 'dotnet' | 'nodejs' | 'android' | 'python' | 'java' | 'go';
  href: string;
}

/**
 * A canonical architectural pattern (PAT-NNNN) as stored under
 * `reference/core/architecture/patterns/pat/`. Shape derives from
 * `src/rulesets/schema/pattern.schema.json`, which is the source of truth.
 */
export interface PatternRecord {
  id: string;
  name: string;
  aka?: string[];
  kind: PatternKind;
  category: PatternCategory;
  status: PatternStatus;
  problem: string;
  forces: string[];
  solution: string;
  whyProhibited?: string;
  requiredCorrection?: string;
  implementationGuide?: { href: string; summary?: string; normative?: boolean; caveats?: string[] };
  appliesTo: PatternApplication[];
  variants?: PatternVariant[];
  relationships?: PatternRelationship[];
  governedBy?: PatternGovernance[];
  enforcedBy: PatternEnforcement[];
  implementations?: PatternImplementation[];
  sources?: { href: string; note?: string }[];
}

/** Cheap, index-free filters applied over the loaded catalogue. */
export interface PatternCatalogFilters {
  /** Keep only patterns in this category. */
  category?: PatternCategory;
  /** Keep only patterns or only anti-patterns. */
  kind?: PatternKind;
  /** Keep only patterns whose `appliesTo` mentions this topology (not-applicable entries excluded). */
  topology?: string;
  /** true → only patterns with at least one enforcing rule; false → only unenforced ones. */
  enforced?: boolean;
}

/** A pattern paired with the applicability entry that matched a topology query. */
export interface TopologyPatternApplication {
  pattern: PatternRecord;
  applicability: PatternApplicability;
  guidance: string;
  /** The enforcement rules the pattern imposes — "what rules does this impose on me?". */
  enforcedBy: PatternEnforcement[];
}

const APPLICABILITY_ORDER: Record<PatternApplicability, number> = {
  required: 0,
  recommended: 1,
  optional: 2,
  'not-applicable': 3,
};

/**
 * Discovers the repository's canonical pattern records (PAT-NNNN) without coupling Core
 * to a CLI, MCP or REST surface. Stateless by ADR-0101: the corpus root arrives as a
 * parameter, never resolved from workspace or tenant state held by the service.
 */
export class PatternCatalogService {
  constructor(private readonly fs: IFileSystem, private readonly logger: ILogger) {}

  /**
   * Loads every PAT record under `corePath`, optionally filtered.
   *
   * Throws rather than returning `[]` when no pattern directory exists or the scan finds
   * zero records: a vacuous empty catalogue reported as success is exactly the failure
   * mode that hid dead generator paths in this repo. An empty result AFTER filtering is
   * legitimate and returned normally.
   */
  async list(corePath: string, filters?: PatternCatalogFilters): Promise<PatternRecord[]> {
    const candidateRoots = this.candidateRoots(corePath);
    const existingRoots: string[] = [];
    for (const root of candidateRoots) {
      if (await this.fs.exists(root)) existingRoots.push(root);
    }
    if (existingRoots.length === 0) {
      throw new Error(
        `No canonical pattern directory found under ${corePath}.\n` +
          `Looked in: ${candidateRoots.join(', ')}.\n` +
          `Refusing to report an empty pattern catalogue as success -- a missing corpus is ` +
          `not the same as a corpus with no patterns.`,
      );
    }

    const files = (await Promise.all(existingRoots.map((root) => this.findPatternFiles(root)))).flat();
    const records = await Promise.all(files.map((file) => this.readPattern(file)));
    const byId = new Map<string, PatternRecord>();
    for (const record of records) {
      if (!byId.has(record.id)) byId.set(record.id, record);
    }
    if (byId.size === 0) {
      throw new Error(
        `Scanned ${existingRoots.join(', ')} and found zero PAT records.\n` +
          `A zero-pattern scan must never be reported as "the catalogue is empty" -- ` +
          `it means the layout moved or the files are not named pat-NNNN-*.json.`,
      );
    }

    const all = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
    return filters ? all.filter((record) => this.matches(record, filters)) : all;
  }

  /** Returns one PAT by id (`PAT-0001`), case-insensitively, or `undefined` when absent. */
  async get(corePath: string, patternId: string): Promise<PatternRecord | undefined> {
    const wanted = patternId.trim().toUpperCase();
    return (await this.list(corePath)).find((record) => record.id.toUpperCase() === wanted);
  }

  /**
   * Highest-value product query: which patterns apply to a topology, how strongly, and
   * which rules they impose. Ordered required → recommended → optional; `not-applicable`
   * entries are excluded.
   */
  async listByTopology(corePath: string, topologyId: string): Promise<TopologyPatternApplication[]> {
    const patterns = await this.list(corePath);
    const applications: TopologyPatternApplication[] = [];
    for (const pattern of patterns) {
      const entry = pattern.appliesTo.find((a) => a.topology === topologyId);
      if (!entry || entry.applicability === 'not-applicable') continue;
      applications.push({
        pattern,
        applicability: entry.applicability,
        guidance: entry.guidance,
        enforcedBy: pattern.enforcedBy ?? [],
      });
    }
    return applications.sort(
      (a, b) =>
        APPLICABILITY_ORDER[a.applicability] - APPLICABILITY_ORDER[b.applicability] ||
        a.pattern.id.localeCompare(b.pattern.id),
    );
  }

  private candidateRoots(corePath: string): string[] {
    return [
      path.join(corePath, 'reference', 'core', 'architecture', 'patterns', 'pat'),
      path.join(corePath, 'reference', 'architecture', 'patterns', 'pat'),
      path.join(corePath, 'src', 'rulesets', 'patterns', 'pat'),
      path.join(corePath, 'rulesets', 'patterns', 'pat'),
    ];
  }

  private matches(record: PatternRecord, filters: PatternCatalogFilters): boolean {
    if (filters.category && record.category !== filters.category) return false;
    if (filters.kind && record.kind !== filters.kind) return false;
    if (filters.topology) {
      const entry = record.appliesTo.find((a) => a.topology === filters.topology);
      if (!entry || entry.applicability === 'not-applicable') return false;
    }
    if (filters.enforced !== undefined) {
      const isEnforced = (record.enforcedBy ?? []).length > 0;
      if (isEnforced !== filters.enforced) return false;
    }
    return true;
  }

  private async findPatternFiles(directory: string, depth = 0): Promise<string[]> {
    if (depth > 3 || !(await this.fs.exists(directory))) return [];
    const entries = await this.fs.readdir(directory);
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isFile() && /^pat-\d{4}-.+\.json$/i.test(entry.name)) files.push(fullPath);
      if (entry.isDirectory()) files.push(...(await this.findPatternFiles(fullPath, depth + 1)));
    }
    return files;
  }

  private async readPattern(filePath: string): Promise<PatternRecord> {
    try {
      const record = JSON.parse(await this.fs.readFile(filePath)) as PatternRecord;
      if (!/^PAT-\d{4}$/.test(record?.id ?? '') || !record.kind || !record.category) {
        throw new Error('missing required canonical pattern identity (id/kind/category)');
      }
      return record;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invalid canonical pattern at ${filePath}: ${message}`);
      throw new Error(`Canonical pattern error in ${filePath}: ${message}`);
    }
  }
}
