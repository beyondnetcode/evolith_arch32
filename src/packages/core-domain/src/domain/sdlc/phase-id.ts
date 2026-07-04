import { GATE_PHASES, GatePhase, isGatePhase } from '../gate-evidence';

/**
 * GT-343 — single canonical source for SDLC phase identifiers.
 *
 * The semantic ids (`discovery | design | construction | qa | release`,
 * shared with {@link GatePhase}) are authoritative. The legacy `f1..f5`,
 * `gate-f1..f5`, `phase-1..5` and bare `1..5` forms are DEPRECATED aliases,
 * accepted only at boundaries (on-disk governance files, older configs) and
 * normalized to the canonical id. New code/schemas/docs must use the canonical
 * ids and must NOT reuse the `F#` namespace (which belongs to architecture
 * topology maturity — see sdk/cli topology-catalog).
 */
export type PhaseId = GatePhase;

/** Canonical SDLC phase ids in lifecycle order. */
export const CANONICAL_PHASE_IDS: readonly PhaseId[] = GATE_PHASES;

/** Deprecated f-number → canonical, in SDLC order (f1 = first phase). */
const LEGACY_F_TO_CANONICAL: Readonly<Record<string, PhaseId>> = {
  f1: 'discovery',
  f2: 'design',
  f3: 'construction',
  f4: 'qa',
  f5: 'release',
};

/** Canonical → legacy f-id used by on-disk gate/phase files (`gate-f1`, `phase-f1`). */
const CANONICAL_TO_LEGACY_F: Readonly<Record<PhaseId, string>> = {
  discovery: 'f1',
  design: 'f2',
  construction: 'f3',
  qa: 'f4',
  release: 'f5',
};

/** True when `value` is already a canonical SDLC phase id. */
export function isCanonicalPhaseId(value: string): value is PhaseId {
  return isGatePhase(value);
}

/**
 * Normalize any accepted phase input to its canonical id.
 * Accepts canonical ids, `f1..f5`, `gate-f1..f5`, `phase-1..5` and bare `1..5`.
 * Returns `undefined` for unknown input (incl. `phase-0`, which is the workflow
 * foundation state, not an SDLC gate phase).
 */
export function normalizePhaseId(value: string): PhaseId | undefined {
  const v = value.trim().toLowerCase();
  if (isGatePhase(v)) return v as PhaseId;
  if (LEGACY_F_TO_CANONICAL[v]) return LEGACY_F_TO_CANONICAL[v];
  const match = v.match(/^(?:gate-f|phase-f|phase-|f)?([1-5])$/);
  if (match) return LEGACY_F_TO_CANONICAL[`f${match[1]}`];
  return undefined;
}

/**
 * Map any accepted phase input to the legacy `f1..f5` id that on-disk gate/phase
 * files still use. Returns `undefined` for unknown input. Use only at the
 * filesystem boundary while the governance data files carry legacy ids.
 */
export function toLegacyPhaseId(value: string): string | undefined {
  const canonical = normalizePhaseId(value);
  return canonical ? CANONICAL_TO_LEGACY_F[canonical] : undefined;
}
