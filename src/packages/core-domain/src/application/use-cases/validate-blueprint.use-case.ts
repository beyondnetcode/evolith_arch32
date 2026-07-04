/**
 * ValidateBlueprintUseCase (GT-325).
 *
 * Validates a Blueprint entity against:
 *   (a) Topology existence  — rulesets/topologies/<id>/topology.manifest.json
 *   (b) Ruleset existence   — each ruleset path must exist on disk
 *   (c) Gate existence      — each gate id must appear in gate-f*.json files
 *   (d) SDLC phase validity — must be one of f1–f5
 *   (e) OPA policy existence — each customPolicy path must exist on disk
 *
 * On success the blueprint state transitions DRAFT → SUBMITTED → VALIDATING → VALIDATED
 * and the DomainEvents bus receives BlueprintGeneratedEvent + BlueprintValidatedEvent.
 */

import * as path from 'path';
import * as fs from 'fs';

import { Blueprint, BlueprintContent } from '../../domain/entities/blueprint';
import { ArtifactState, ArtifactStateMachine } from '../../domain/lifecycle/artifact-state-machine';
import { Verdict, VerdictRecord } from '../../domain/verdict/verdict';
import { DomainEvents } from '../../domain/events/domain-events';
import { Role } from '../../domain/rbac/role';
import { normalizePhaseId, CANONICAL_PHASE_IDS } from '../../domain/sdlc/phase-id';
import type { IDomainEventBus } from '../ports/event-bus.port';

// ---------------------------------------------------------------------------
// Context + Result types
// ---------------------------------------------------------------------------

export interface BlueprintValidationContext {
  tenantId: string;
  actorRoles: Role[];
  /** Absolute path to the Evolith Core repository. */
  corePath: string;
  /** Absolute path to the SDLC gate registry directory (contains gate-f*.json). */
  sdlcPath: string;
}

export interface BlueprintViolation {
  code: string;
  field?: string;
  message: string;
}

export interface BlueprintValidationResult {
  verdict: Verdict;
  violations: BlueprintViolation[];
  validatedAt: string;
}

// ---------------------------------------------------------------------------
// ValidateBlueprintUseCase
// ---------------------------------------------------------------------------

export class ValidateBlueprintUseCase {
  private readonly stateMachine: ArtifactStateMachine;

  constructor(private readonly eventBus?: IDomainEventBus) {
    this.stateMachine = new ArtifactStateMachine(eventBus);
  }

  execute(
    blueprint: Blueprint,
    context: BlueprintValidationContext,
  ): BlueprintValidationResult {
    const violations: BlueprintViolation[] = [];
    const content: BlueprintContent = blueprint.content;

    // (a) Topology check
    this.checkTopology(content.topologyId, context.corePath, violations);

    // (b) Ruleset check
    this.checkRulesets(content.rulesets, context.corePath, violations);

    // (c) Gate check
    this.checkGates(content.gateIds, context.sdlcPath, violations);

    // (d) SDLC phase check
    this.checkPhase(blueprint.phase, violations);

    // (e) OPA policy check
    if (content.customPolicies && content.customPolicies.length > 0) {
      this.checkOPAPolicies(content.customPolicies, context.corePath, violations);
    }

    const passed = violations.length === 0;
    const verdict = passed ? Verdict.PASS : Verdict.FAIL;
    const validatedAt = new Date().toISOString();

    // State machine transitions: DRAFT → SUBMITTED → VALIDATING → VALIDATED | REJECTED
    this.applyStateTransitions(blueprint, passed, context);

    // Append to verdict history
    const record: VerdictRecord = {
      verdict,
      decidedAt: validatedAt,
      decidedBy: 'validate-blueprint-use-case',
    };
    (blueprint.verdictHistory as VerdictRecord[]).push(record);

    // Emit domain events
    if (this.eventBus) {
      void this.eventBus.publish(
        DomainEvents.blueprintGenerated({
          projectId: context.tenantId,
          blueprintId: blueprint.id,
          generatedAt: validatedAt,
        }),
      );
      void this.eventBus.publish(
        DomainEvents.blueprintValidated({
          projectId: context.tenantId,
          blueprintId: blueprint.id,
          passed,
          validatedAt,
        }),
      );
    }

    return { verdict, violations, validatedAt };
  }

  // -------------------------------------------------------------------------
  // Private checkers
  // -------------------------------------------------------------------------

  private checkTopology(
    topologyId: string,
    corePath: string,
    violations: BlueprintViolation[],
  ): void {
    const manifest = path.join(
      corePath,
      'rulesets',
      'topologies',
      topologyId,
      'topology.manifest.json',
    );
    if (!fs.existsSync(manifest)) {
      violations.push({
        code: 'TOPOLOGY_NOT_FOUND',
        field: 'content.topologyId',
        message: `Topology "${topologyId}" not found — expected manifest at rulesets/topologies/${topologyId}/topology.manifest.json`,
      });
    }
  }

  private checkRulesets(
    rulesets: string[],
    corePath: string,
    violations: BlueprintViolation[],
  ): void {
    for (const ruleset of rulesets) {
      const abs = path.isAbsolute(ruleset) ? ruleset : path.join(corePath, ruleset);
      if (!fs.existsSync(abs)) {
        violations.push({
          code: 'RULESET_NOT_FOUND',
          field: 'content.rulesets',
          message: `Ruleset "${ruleset}" does not exist on disk.`,
        });
      }
    }
  }

  private checkGates(
    gateIds: string[],
    sdlcPath: string,
    violations: BlueprintViolation[],
  ): void {
    // Build the known gate registry by scanning gate-f*.json files
    const knownGates = new Set<string>();
    try {
      const files = fs.readdirSync(sdlcPath).filter(f => /^gate-f\d+\.json$/.test(f));
      for (const file of files) {
        const filePath = path.join(sdlcPath, file);
        try {
          const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
          const gateData = raw as { id?: string; gates?: Array<{ id: string }> };
          if (gateData.id) knownGates.add(gateData.id);
          if (Array.isArray(gateData.gates)) {
            for (const g of gateData.gates) knownGates.add(g.id);
          }
          // Also add the filename stem as a fallback gate id
          knownGates.add(path.basename(file, '.json'));
        } catch {
          // ignore malformed gate files
        }
      }
    } catch {
      // sdlcPath may not exist in tests — emit no violation for missing dir itself
    }

    for (const gateId of gateIds) {
      if (!knownGates.has(gateId)) {
        violations.push({
          code: 'GATE_NOT_FOUND',
          field: 'content.gateIds',
          message: `Gate "${gateId}" was not found in the SDLC gate registry at "${sdlcPath}".`,
        });
      }
    }
  }

  private checkPhase(phase: string, violations: BlueprintViolation[]): void {
    // GT-343: accept canonical SDLC ids (discovery…release); legacy f1..f5 are
    // accepted as deprecated aliases via the normalizer.
    if (!normalizePhaseId(phase)) {
      violations.push({
        code: 'INVALID_PHASE',
        field: 'phase',
        message: `Phase "${phase}" is not a valid SDLC phase. Expected one of: ${CANONICAL_PHASE_IDS.join(', ')} (legacy f1..f5 accepted).`,
      });
    }
  }

  private checkOPAPolicies(
    policies: string[],
    corePath: string,
    violations: BlueprintViolation[],
  ): void {
    for (const policy of policies) {
      const abs = path.isAbsolute(policy) ? policy : path.join(corePath, policy);
      if (!fs.existsSync(abs)) {
        violations.push({
          code: 'OPA_POLICY_NOT_FOUND',
          field: 'content.customPolicies',
          message: `OPA policy "${policy}" does not exist on disk.`,
        });
      }
    }
  }

  private applyStateTransitions(
    blueprint: Blueprint,
    passed: boolean,
    context: BlueprintValidationContext,
  ): void {
    const ctx = {
      artifactPath: `blueprint:${blueprint.id}`,
      artifactType: 'blueprint',
      projectId: context.tenantId,
    };

    const transitions: [ArtifactState, ArtifactState][] = [
      [ArtifactState.DRAFT, ArtifactState.SUBMITTED],
      [ArtifactState.SUBMITTED, ArtifactState.VALIDATING],
      [ArtifactState.VALIDATING, passed ? ArtifactState.VALIDATED : ArtifactState.REJECTED],
    ];

    for (const [from, to] of transitions) {
      if (blueprint.state === from) {
        this.stateMachine.transition(from, to, ctx);
        blueprint.state = to;
      }
    }
  }
}
