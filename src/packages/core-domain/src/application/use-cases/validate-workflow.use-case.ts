/**
 * GT-317 — ValidateWorkflowUseCase
 *
 * Validates an externally supplied WorkflowDefinition against Core invariants:
 *   (a) All mandatory SDLC phases present (the five canonical gate phases).
 *   (b) Each gate has at least one required artifact.
 *   (c) No gate omits a non-omittable artifact (derived from Core SDLC data).
 *   (d) OPA rules referenced by gates exist in the rulesets directory.
 *
 * Core stores ZERO tenant configuration — the WorkflowDefinition is always
 * supplied by the caller (Tracker).
 *
 * GT-343 (stage 2b) — phase/gate identifiers are routed through
 * {@link normalizePhaseId} / {@link toLegacyPhaseId}. Callers may now declare
 * either the canonical SDLC ids (`discovery|design|construction|qa|release`)
 * OR the deprecated `f1..f5` / `gate-f1..f5` aliases — both are accepted and
 * matched after normalization. The on-disk gate/artifact data is still keyed
 * by the legacy `f#` id, so lookups normalize to it via `toLegacyPhaseId`.
 *
 * DIP TODO: Directly imports `fs` (sync operations). Should accept IFileSystem
 * via constructor injection for testability and hexagonal boundary compliance.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  WorkflowDefinition,
  WorkflowValidationResult,
  WorkflowViolation,
  WorkflowGateDefinition,
} from '../../domain/workflow';
import {
  CANONICAL_PHASE_IDS,
  normalizePhaseId,
  toLegacyPhaseId,
} from '../../domain/sdlc/phase-id';
import { CatalogService } from '../services/catalog.service';

// ---------------------------------------------------------------------------
// Constants derived from canonical Core SDLC data
// ---------------------------------------------------------------------------

/**
 * Non-omittable artifact names per legacy gate id.  These are artifacts whose
 * absence is always a blocking violation regardless of what the caller supplies.
 *
 * Keyed by the on-disk legacy gate id (`gate-f1..f5`) because the underlying
 * governance data files (reference/governance/sdlc/gates/gate-f*.json) still
 * use that namespace. Lookups normalize the supplied gate id to this key so a
 * caller may pass either `gate-f1` or a canonical `gate-discovery`.
 */
const NON_OMITTABLE_ARTIFACTS: Record<string, string[]> = {
  'gate-f1': ['PRD', 'Technical Feasibility Canvas', 'Build-versus-Compose Analysis'],
  'gate-f2': ['ADR Registry', 'Bounded Context Map'],
  'gate-f3': ['CI Pipeline', 'Definition of Done Checklist', 'Coverage Report'],
  'gate-f4': ['Test Summary Report', 'Security Scan Report'],
  'gate-f5': ['Release Notes', 'Rollback Procedure', 'Deployment Evidence'],
};

/**
 * Resolve the legacy on-disk gate id (`gate-f#`) for an arbitrary supplied gate
 * id. Accepts canonical (`gate-discovery`, `discovery`), legacy (`gate-f1`,
 * `f1`) and bare ordinals. Returns `undefined` when the gate id carries no
 * recognizable SDLC phase token.
 */
function toLegacyGateId(gateId: string): string | undefined {
  const phaseToken = gateId.replace(/^gate-/i, '');
  const legacy = toLegacyPhaseId(phaseToken);
  return legacy ? `gate-${legacy}` : undefined;
}

// ---------------------------------------------------------------------------
// ValidateWorkflowUseCase
// ---------------------------------------------------------------------------

export class ValidateWorkflowUseCase {
  private readonly catalog: CatalogService;
  private readonly repoRoot: string;

  /**
   * @param corePath  Absolute path to the repository root.
   *                  Defaults to resolving six levels up from this compiled
   *                  file so the class works out-of-the-box inside the monorepo.
   */
  constructor(corePath?: string) {
    this.repoRoot =
      corePath ?? path.resolve(__dirname, '..', '..', '..', '..', '..');
    this.catalog = new CatalogService(this.repoRoot);
  }

  execute(definition: WorkflowDefinition): WorkflowValidationResult {
    const violations: WorkflowViolation[] = [];

    // (a) All mandatory phases present
    this.checkMandatoryPhases(definition, violations);

    for (const phase of definition.phases) {
      for (const gate of phase.gates) {
        // (b) Each gate has at least one required artifact
        this.checkGateHasArtifacts(phase.id, gate, violations);

        // (c) Non-omittable artifacts not missing
        this.checkNonOmittableArtifacts(phase.id, gate, violations);

        // (d) OPA rules referenced exist on disk
        this.checkOpaRulesExist(phase.id, gate, violations);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // -------------------------------------------------------------------------
  // Private checkers
  // -------------------------------------------------------------------------

  private checkMandatoryPhases(
    definition: WorkflowDefinition,
    violations: WorkflowViolation[],
  ): void {
    // Normalize every supplied phase id to its canonical form so a caller may
    // declare phases as canonical ids OR the deprecated `f1..f5` aliases.
    // Unrecognized ids simply never satisfy a mandatory phase.
    const suppliedCanonical = new Set(
      definition.phases
        .map(p => normalizePhaseId(p.id))
        .filter((id): id is NonNullable<typeof id> => id !== undefined),
    );
    for (const canonical of CANONICAL_PHASE_IDS) {
      if (!suppliedCanonical.has(canonical)) {
        // Report the legacy `f#` id to keep on-disk-aligned, backward-compatible
        // violation payloads (governance gate files are still `gate-f#`).
        const legacy = toLegacyPhaseId(canonical) ?? canonical;
        violations.push({
          code: 'MISSING_MANDATORY_PHASE',
          phase: legacy,
          message: `Mandatory SDLC phase "${legacy}" is absent from the supplied WorkflowDefinition.`,
        });
      }
    }
  }

  private checkGateHasArtifacts(
    phaseId: string,
    gate: WorkflowGateDefinition,
    violations: WorkflowViolation[],
  ): void {
    if (!gate.requiredArtifacts || gate.requiredArtifacts.length === 0) {
      violations.push({
        code: 'GATE_NO_ARTIFACTS',
        phase: phaseId,
        gate: gate.id,
        message: `Gate "${gate.id}" in phase "${phaseId}" has no required artifacts.`,
      });
    }
  }

  private checkNonOmittableArtifacts(
    phaseId: string,
    gate: WorkflowGateDefinition,
    violations: WorkflowViolation[],
  ): void {
    // Normalize the supplied gate id to its legacy on-disk key so a caller may
    // pass either `gate-f1` or a canonical `gate-discovery`. Fall back to the
    // raw id for non-phase gate ids that may key the map directly.
    const lookupKey = toLegacyGateId(gate.id) ?? gate.id;
    const mandatory = NON_OMITTABLE_ARTIFACTS[lookupKey] ?? [];
    const supplied = new Set(gate.requiredArtifacts);
    for (const artifact of mandatory) {
      if (!supplied.has(artifact)) {
        violations.push({
          code: 'NON_OMITTABLE_ARTIFACT_MISSING',
          phase: phaseId,
          gate: gate.id,
          artifact,
          message: `Non-omittable artifact "${artifact}" is missing from gate "${gate.id}" (phase "${phaseId}").`,
        });
      }
    }
  }

  private checkOpaRulesExist(
    phaseId: string,
    gate: WorkflowGateDefinition,
    violations: WorkflowViolation[],
  ): void {
    for (const rule of gate.rules ?? []) {
      // rule is relative to the repo root, e.g. "rulesets/opa/governance.rego"
      const absolute = path.join(this.repoRoot, rule);
      if (!fs.existsSync(absolute)) {
        violations.push({
          code: 'OPA_RULE_NOT_FOUND',
          phase: phaseId,
          gate: gate.id,
          message: `OPA rule "${rule}" referenced by gate "${gate.id}" does not exist on disk.`,
        });
      }
    }
  }
}
