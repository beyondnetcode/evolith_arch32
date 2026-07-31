/**
 * Canonical JSON + sha256 fingerprinting shared by the capability manifest and
 * the per-operation schema catalog (GT-513, GT-583).
 *
 * Extracted from `capabilities-manifest.ts` when GT-583 gave the operation
 * catalog its own fingerprint: two fingerprints computed by two copies of
 * `sortDeep` is the same disease this gap was opened for, one level down.
 */

import { createHash } from 'node:crypto';

/** Deterministically sort object keys (recursively); arrays keep their order. */
export function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(source[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Canonical JSON: stable, key-sorted serialization for stable hashing. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

/** sha256 hex of the canonical JSON of `value`. */
export function sha256Hex(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}
