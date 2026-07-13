/**
 * Ownership ingestion (GT-527 · axis 2 — positioning §13.2).
 *
 * Ingests service/component OWNERSHIP from the sources a company already maintains —
 * Backstage `catalog-info.yaml`, Port/Cortex/OpsLevel blueprints — and normalizes it to
 * ONE canonical shape, so a {@link Violation}'s accountable `owner` is resolved from the
 * existing source of truth instead of being re-captured. This closes the
 * violation→owner→compliance chain: GT-527 fills `owner`, GT-525 fills `complianceControls`.
 *
 * Layering: this is PURE. Parsing YAML/JSON off disk and FETCHING Port/Cortex APIs are the
 * read-only connector/infra concern (no lock-in — read-only, normalized here). These
 * functions take already-parsed objects and emit the canonical model + a resolver.
 */

import type { Violation } from './violation';

/** A component's ownership, normalized across sources. */
export interface OwnershipEntry {
  /** Component/service name. */
  readonly component: string;
  /** Accountable owner (team/group), verbatim from the source. */
  readonly owner: string;
  /** Repo-relative path prefix the component owns, when known (enables file→owner resolution). */
  readonly pathPrefix?: string;
  /** Where this entry came from, for provenance (`backstage`, `port`, `cortex`, `opslevel`). */
  readonly source: string;
}

/** Normalize a path for prefix comparison (posix separators, strip `./` and trailing `/`). */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

/**
 * Resolve the owner of a file by longest-prefix match over the entries that carry a
 * `pathPrefix`. Returns `undefined` when no owned path contains the file.
 */
export function resolveOwner(filePath: string, entries: readonly OwnershipEntry[]): string | undefined {
  const file = normalizePath(filePath);
  let best: OwnershipEntry | undefined;
  for (const e of entries) {
    if (!e.pathPrefix) continue;
    const prefix = normalizePath(e.pathPrefix);
    if (file === prefix || file.startsWith(`${prefix}/`)) {
      if (!best || normalizePath(best.pathPrefix!).length < prefix.length) best = e;
    }
  }
  return best?.owner;
}

// ---------------------------------------------------------------------------
// Backstage catalog-info entities
// ---------------------------------------------------------------------------

/** The subset of a Backstage entity we read. `catalog-info.yaml` is parsed upstream. */
export interface BackstageEntity {
  readonly kind?: string;
  readonly metadata?: {
    readonly name?: string;
    readonly annotations?: Readonly<Record<string, string>>;
  };
  readonly spec?: { readonly owner?: string };
}

/** Path annotation Evolith reads first; falls back to a relative `backstage.io/source-location`. */
const BACKSTAGE_PATH_ANNOTATION = 'evolith.io/path';
const BACKSTAGE_SOURCE_ANNOTATION = 'backstage.io/source-location';

function backstagePathPrefix(annotations: Readonly<Record<string, string>> | undefined): string | undefined {
  if (!annotations) return undefined;
  const explicit = annotations[BACKSTAGE_PATH_ANNOTATION];
  if (explicit) return normalizePath(explicit);
  // `backstage.io/source-location` is often `url:https://…`; only a `file:`/relative form is a path.
  const src = annotations[BACKSTAGE_SOURCE_ANNOTATION];
  if (src && !/^url:/i.test(src)) return normalizePath(src.replace(/^file:/i, ''));
  return undefined;
}

/**
 * Map parsed Backstage `Component` entities to {@link OwnershipEntry}s. Entities that are not
 * Components, or lack a name/owner, are dropped (read-only, no lock-in). Path prefix comes from
 * the `evolith.io/path` annotation, else a relative `backstage.io/source-location`.
 */
export function parseBackstageCatalog(entities: readonly BackstageEntity[]): OwnershipEntry[] {
  const out: OwnershipEntry[] = [];
  for (const e of entities) {
    if (e.kind !== 'Component') continue;
    const component = e.metadata?.name;
    const owner = e.spec?.owner;
    if (!component || !owner) continue;
    out.push({ component, owner, pathPrefix: backstagePathPrefix(e.metadata?.annotations), source: 'backstage' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generic blueprint records (Port / Cortex / OpsLevel), already normalized to JSON
// ---------------------------------------------------------------------------

/** A normalized ownership record from an IDP blueprint export (Port/Cortex/OpsLevel). */
export interface BlueprintOwnershipRecord {
  readonly component?: string;
  readonly identifier?: string;
  readonly owner?: string;
  readonly team?: string;
  readonly path?: string;
}

/** Map generic IDP blueprint records to {@link OwnershipEntry}s (component|identifier, owner|team). */
export function parseBlueprintOwnership(records: readonly BlueprintOwnershipRecord[], source: string): OwnershipEntry[] {
  const out: OwnershipEntry[] = [];
  for (const r of records) {
    const component = r.component ?? r.identifier;
    const owner = r.owner ?? r.team;
    if (!component || !owner) continue;
    out.push({ component, owner, pathPrefix: r.path ? normalizePath(r.path) : undefined, source });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

/**
 * Enrich violations with a resolved `owner` (by file path), WITHOUT overwriting an owner a
 * violation already carries. Returns new objects; never mutates the inputs. `owner` is
 * derived metadata (excluded from the fingerprint), like `complianceControls` (GT-525).
 */
export function enrichViolationsWithOwner(
  violations: readonly Violation[],
  entries: readonly OwnershipEntry[],
): Violation[] {
  return violations.map((v) => {
    if (v.owner || !v.file) return v;
    const owner = resolveOwner(v.file, entries);
    return owner ? { ...v, owner } : v;
  });
}
