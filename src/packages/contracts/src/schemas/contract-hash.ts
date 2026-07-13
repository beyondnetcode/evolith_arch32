/**
 * Canonical JSON serialization + sha256 fingerprinting for the contract set
 * (GT-513 · EAG-06 — Stable API + capabilities manifest).
 *
 * The algorithm MUST stay byte-for-byte compatible with the domain's
 * `capabilities-manifest` fingerprint so that a hash produced here can be
 * compared 1:1 against the live capability manifest served by
 * `GET /api/v1/capabilities`: object keys are sorted recursively, array order
 * is preserved, and the result is hashed as UTF-8.
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
