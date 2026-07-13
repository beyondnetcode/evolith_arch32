/**
 * Waiver flow for `waiverRef` (GT-518 · EAG-13).
 *
 * A deterministic state machine + a store seam so a violation can be temporarily WAIVED
 * (suppressed from blocking) with a full audit trail until it expires. The four lifecycle
 * steps the gap mandates are pure transitions:
 *
 *   request → approve → version → expire
 *
 *  - `requestWaiver`  creates version 1 in `requested`.
 *  - `approveWaiver`  moves `requested → approved` (records approver + time).
 *  - `reviseWaiver`   VERSIONS an existing waiver: a new immutable version (n+1) back in
 *                     `requested`, `supersedes` the prior — nothing is mutated in place.
 *  - expiry is TIME-derived, not a stored transition: {@link effectiveStatus}/{@link isWaiverActive}
 *    treat an approved waiver as `expired` once `now >= expiresAt`.
 *
 * A waived finding is suppressed via {@link applyWaivers}, which returns both the retained
 * violations AND the audit trail (which waiver, which version, expiry) of every suppression.
 *
 * Layering: PURE. Persisting waivers is the infra concern behind {@link IWaiverStore}; the
 * in-memory store here is the deterministic reference implementation used by tests and the CLI.
 */

import type { Violation } from './violation';

/** Lifecycle state of a single waiver VERSION. `expired` is time-derived (see {@link effectiveStatus}). */
export type WaiverStatus = 'requested' | 'approved' | 'rejected' | 'expired';

/** An immutable waiver version. A `waiverRef` may have several versions; the highest active one wins. */
export interface Waiver {
  /** Stable id shared across every version of this waiver (the `waiverRef` a finding cites). */
  readonly waiverRef: string;
  /** 1-based version; bumped by {@link reviseWaiver}. */
  readonly version: number;
  /** Fingerprint of the {@link Violation} this waiver suppresses. */
  readonly fingerprint: string;
  readonly status: WaiverStatus;
  /** Why the violation is waived (audit). */
  readonly reason: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  /** Hard expiry (ISO-8601 UTC). After this instant the waiver no longer suppresses. */
  readonly expiresAt: string;
  /** The prior version this one replaces, when produced by {@link reviseWaiver}. */
  readonly supersedes?: number;
}

/** Raised on an illegal state transition (e.g. approving an already-approved/rejected waiver). */
export class WaiverTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaiverTransitionError';
  }
}

export interface RequestWaiverInput {
  readonly waiverRef: string;
  readonly fingerprint: string;
  readonly reason: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly expiresAt: string;
}

/** Create version 1 of a waiver in `requested`. */
export function requestWaiver(input: RequestWaiverInput): Waiver {
  if (Date.parse(input.expiresAt) <= Date.parse(input.requestedAt)) {
    throw new WaiverTransitionError(`Waiver ${input.waiverRef} expiresAt must be after requestedAt`);
  }
  return {
    waiverRef: input.waiverRef,
    version: 1,
    fingerprint: input.fingerprint,
    status: 'requested',
    reason: input.reason,
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt,
    expiresAt: input.expiresAt,
  };
}

/** Approve a `requested` waiver → `approved`. Any other starting state is illegal. */
export function approveWaiver(waiver: Waiver, approvedBy: string, approvedAt: string): Waiver {
  if (waiver.status !== 'requested') {
    throw new WaiverTransitionError(
      `Waiver ${waiver.waiverRef}@v${waiver.version} cannot be approved from '${waiver.status}'`,
    );
  }
  return { ...waiver, status: 'approved', approvedBy, approvedAt };
}

/** Reject a `requested` waiver → `rejected`. Any other starting state is illegal. */
export function rejectWaiver(waiver: Waiver): Waiver {
  if (waiver.status !== 'requested') {
    throw new WaiverTransitionError(
      `Waiver ${waiver.waiverRef}@v${waiver.version} cannot be rejected from '${waiver.status}'`,
    );
  }
  return { ...waiver, status: 'rejected' };
}

export interface ReviseWaiverInput {
  readonly reason?: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly expiresAt: string;
}

/**
 * VERSION a waiver: produce a fresh `requested` version (n+1) that `supersedes` the current one.
 * Nothing is mutated in place — the prior version stays in the store as history.
 */
export function reviseWaiver(current: Waiver, input: ReviseWaiverInput): Waiver {
  if (Date.parse(input.expiresAt) <= Date.parse(input.requestedAt)) {
    throw new WaiverTransitionError(`Waiver ${current.waiverRef} expiresAt must be after requestedAt`);
  }
  return {
    waiverRef: current.waiverRef,
    version: current.version + 1,
    fingerprint: current.fingerprint,
    status: 'requested',
    reason: input.reason ?? current.reason,
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt,
    expiresAt: input.expiresAt,
    supersedes: current.version,
  };
}

/** True when `now` is at or past the waiver's `expiresAt`. */
export function isExpired(waiver: Waiver, now: string): boolean {
  return Date.parse(now) >= Date.parse(waiver.expiresAt);
}

/**
 * The effective status of a waiver AT `now`: an approved waiver past its expiry reads as
 * `expired`; every other stored status passes through unchanged.
 */
export function effectiveStatus(waiver: Waiver, now: string): WaiverStatus {
  if (waiver.status === 'approved' && isExpired(waiver, now)) return 'expired';
  return waiver.status;
}

/** A waiver actively suppresses a finding only when approved AND not yet expired. */
export function isWaiverActive(waiver: Waiver, now: string): boolean {
  return effectiveStatus(waiver, now) === 'approved';
}

// ---------------------------------------------------------------------------
// Store seam
// ---------------------------------------------------------------------------

/** Persistence seam for waivers. Infra implements it (fs/db); the in-memory store is the reference. */
export interface IWaiverStore {
  /** Every version recorded for a fingerprint, in insertion order. */
  list(fingerprint: string): readonly Waiver[];
  /** All waivers across all fingerprints (audit/export). */
  all(): readonly Waiver[];
  /** Record a waiver version. Idempotent on (`waiverRef`, `version`) — a duplicate replaces it. */
  put(waiver: Waiver): void;
}

/** Deterministic, dependency-free {@link IWaiverStore} for tests and the CLI. */
export class InMemoryWaiverStore implements IWaiverStore {
  private readonly byFingerprint = new Map<string, Waiver[]>();

  constructor(seed: readonly Waiver[] = []) {
    for (const w of seed) this.put(w);
  }

  list(fingerprint: string): readonly Waiver[] {
    return this.byFingerprint.get(fingerprint) ?? [];
  }

  all(): readonly Waiver[] {
    return [...this.byFingerprint.values()].flat();
  }

  put(waiver: Waiver): void {
    const bucket = this.byFingerprint.get(waiver.fingerprint) ?? [];
    const idx = bucket.findIndex((w) => w.waiverRef === waiver.waiverRef && w.version === waiver.version);
    if (idx >= 0) bucket[idx] = waiver;
    else bucket.push(waiver);
    this.byFingerprint.set(waiver.fingerprint, bucket);
  }
}

/**
 * The active waiver for a fingerprint at `now`: the HIGHEST-version waiver that is approved and
 * not expired. Returns `undefined` when none suppresses the finding (unrequested / pending /
 * rejected / expired) — so the finding blocks.
 */
export function activeWaiverFor(
  store: IWaiverStore,
  fingerprint: string,
  now: string,
): Waiver | undefined {
  let active: Waiver | undefined;
  for (const w of store.list(fingerprint)) {
    if (isWaiverActive(w, now) && (!active || w.version > active.version)) active = w;
  }
  return active;
}

/** One suppressed violation + the waiver version that suppressed it (the audit trail). */
export interface WaiverSuppression {
  readonly violation: Violation;
  readonly waiver: Waiver;
}

export interface ApplyWaiversResult {
  /** Violations that were NOT waived (they still count toward blocking), each left untouched. */
  readonly retained: readonly Violation[];
  /** Violations suppressed by an active waiver, paired with the responsible waiver version. */
  readonly suppressed: readonly WaiverSuppression[];
}

/**
 * Split violations into those an active waiver suppresses and those retained. A suppressed
 * violation keeps its identity; downstream (evidence) marks it `frozen` so it does not block.
 * Deterministic: no clock — `now` is supplied by the caller.
 */
export function applyWaivers(
  violations: readonly Violation[],
  store: IWaiverStore,
  now: string,
): ApplyWaiversResult {
  const retained: Violation[] = [];
  const suppressed: WaiverSuppression[] = [];
  for (const v of violations) {
    const waiver = activeWaiverFor(store, v.fingerprint, now);
    if (waiver) suppressed.push({ violation: v, waiver });
    else retained.push(v);
  }
  return { retained, suppressed };
}
