/**
 * GT-317 — ValidateWorkflowUseCase
 *
 * Validates an externally supplied WorkflowDefinition against Core invariants:
 *   (a) All mandatory SDLC phases present (F1–F5).
 *   (b) Each gate has at least one required artifact.
 *   (c) No gate omits a non-omittable artifact (derived from Core SDLC data).
 *   (d) OPA rules referenced by gates exist in the rulesets directory.
 *
 * Core stores ZERO tenant configuration — the WorkflowDefinition is always
 * supplied by the caller (Tracker).
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  WorkflowDefinition,
  WorkflowValidationResult,
  WorkflowViolation,
  WorkflowGateDefinition,
} from '../../domain/workflow';
import { CatalogService } from '../services/catalog.service';

// ---------------------------------------------------------------------------
// Constants derived from canonical Core SDLC data
// ---------------------------------------------------------------------------

/** Mandatory phase ids — every valid workflow MUST include all five. */
const MANDATORY_PHASE_IDS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;

/**
 * Non-omittable artifact names per gate.  These are artifacts whose absence
 * is always a blocking violation regardless of what the caller supplies.
 *
 * Derived from reference/governance/sdlc/gates/gate-f*.json.
 */
const NON_OMITTABLE_ARTIFACTS: Record<string, string[]> = {
  'gate-f1': ['PRD', 'Technical Feasibility Canvas', 'Build-versus-Compose Analysis'],
  'gate-f2': ['ADR Registry', 'Bounded Context Map'],
  'gate-f3': ['CI Pipeline', 'Definition of Done Checklist', 'Coverage Report'],
  'gate-f4': ['Test Summary Report', 'Security Scan Report'],
  'gate-f5': ['Release Notes', 'Rollback Procedure', 'Deployment Evidence'],
};

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
    const suppliedIds = new Set(definition.phases.map(p => p.id));
    for (const id of MANDATORY_PHASE_IDS) {
      if (!suppliedIds.has(id)) {
        violations.push({
          code: 'MISSING_MANDATORY_PHASE',
          phase: id,
          message: `Mandatory SDLC phase "${id}" is absent from the supplied WorkflowDefinition.`,
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
    const mandatory = NON_OMITTABLE_ARTIFACTS[gate.id] ?? [];
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
