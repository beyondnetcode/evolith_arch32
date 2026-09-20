/**
 * @file satellite-upgrade-classify.ts
 * @description Who moved a file — the Core, the tenant, or both (GT-673).
 *
 * A pure three-way comparison. `core` is what upstream ships now, `satellite`
 * is what the tenant has on disk, and `baseline` is what the Core delivered the
 * last time it wrote the file (from `.evolith/scaffold-manifest.json`).
 *
 *   satellite == baseline, core != baseline  → upstream-only   (safe to apply)
 *   satellite != baseline, core == baseline  → local-only      (never applied)
 *   satellite != baseline, core != baseline  → conflict        (needs --overwrite-local)
 *   no baseline, core != satellite           → conflict, reason `no-fingerprint`
 *
 * The last row is the fail-closed default for satellites that predate the
 * manifest: with no way to tell an edit from an upstream change, the upgrade
 * refuses to guess. `evolith upgrade --accept-local` is the way out (it records
 * the baseline without copying anything), and the human output says so.
 *
 * No I/O here on purpose — hashes in, verdict out — so the table above is
 * unit-testable line by line.
 */

export type UpgradeClassification = 'upstream-only' | 'local-only' | 'conflict';

/** Why a change is a `conflict`. Only present on conflicts. */
export type ConflictReason = 'no-fingerprint' | 'both-changed';

export interface ClassificationInput {
  /** SHA-256 of the Core's content. */
  core: string;
  /** SHA-256 of the satellite's content, or `null` when the file is absent there. */
  satellite: string | null;
  /** SHA-256 the manifest recorded for the file, or `null` when it has no entry. */
  baseline: string | null;
}

export type ClassificationOutcome =
  /** The satellite lacks the file: nothing local to lose. */
  | { kind: 'add'; classification: 'upstream-only' }
  /** Core and satellite already agree: not a change at all. */
  | { kind: 'unchanged' }
  | { kind: 'modify'; classification: 'upstream-only' | 'local-only' }
  | { kind: 'modify'; classification: 'conflict'; reason: ConflictReason };

export function classifyChange(input: ClassificationInput): ClassificationOutcome {
  const { core, satellite, baseline } = input;

  if (satellite === null) return { kind: 'add', classification: 'upstream-only' };
  if (core === satellite) return { kind: 'unchanged' };

  if (baseline === null) {
    return { kind: 'modify', classification: 'conflict', reason: 'no-fingerprint' };
  }

  const upstreamMoved = core !== baseline;
  const localMoved = satellite !== baseline;

  if (upstreamMoved && !localMoved) return { kind: 'modify', classification: 'upstream-only' };
  if (!upstreamMoved && localMoved) return { kind: 'modify', classification: 'local-only' };
  // Both moved (neither can be false here: core != satellite and both equal
  // baseline is impossible).
  return { kind: 'modify', classification: 'conflict', reason: 'both-changed' };
}
