/**
 * Versioned domain event types for Evolith Core.
 *
 * Naming convention: `<aggregate>.<past-participle>`
 * Version policy: increment version when the payload shape changes in a
 * breaking way; otherwise add optional fields.
 */
import { DomainEvent, createEvent } from './domain-event';
import type { GatePhase, GateVerdict, EvaluatorKind } from '../gate-evidence';

// ---------------------------------------------------------------------------
// Event type constants (stable strings — consumers key off these)
// ---------------------------------------------------------------------------

export const EVENT_TYPES = {
  PHASE_STARTED: 'phase.started',
  PHASE_COMPLETED: 'phase.completed',
  GATE_APPROVED: 'gate.approved',
  GATE_REJECTED: 'gate.rejected',
  ARTIFACT_CREATED: 'artifact.created',
  ARTIFACT_UPDATED: 'artifact.updated',
  ARTIFACT_VALIDATED: 'artifact.validated',
  BLUEPRINT_GENERATED: 'blueprint.generated',
  BLUEPRINT_VALIDATED: 'blueprint.validated',
  WORKFLOW_UPDATED: 'workflow.updated',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface PhaseStartedPayload {
  projectId: string;
  phase: GatePhase;
  startedBy?: string;
}

export interface PhaseCompletedPayload {
  projectId: string;
  phase: GatePhase;
  completedAt: string;
}

export interface GateApprovedPayload {
  projectId: string;
  phase: GatePhase;
  gateId: string;
  rulesetRef: string;
  rulesetVersion?: string;
  evaluatedBy: EvaluatorKind;
  evaluatedAt: string;
}

export interface GateRejectedPayload {
  projectId: string;
  phase: GatePhase;
  gateId: string;
  rulesetRef: string;
  rulesetVersion?: string;
  evaluatedBy: EvaluatorKind;
  evaluatedAt: string;
  violationCount: number;
}

export interface ArtifactCreatedPayload {
  projectId: string;
  artifactPath: string;
  artifactType?: string;
}

export interface ArtifactUpdatedPayload {
  projectId: string;
  artifactPath: string;
  artifactType?: string;
}

export interface ArtifactValidatedPayload {
  projectId: string;
  artifactPath: string;
  passed: boolean;
  validatedAt: string;
}

export interface BlueprintGeneratedPayload {
  projectId: string;
  blueprintId: string;
  generatedAt: string;
}

export interface BlueprintValidatedPayload {
  projectId: string;
  blueprintId: string;
  passed: boolean;
  validatedAt: string;
}

export interface WorkflowUpdatedPayload {
  projectId: string;
  workflowId: string;
  updatedAt: string;
  changedFields?: string[];
}

// ---------------------------------------------------------------------------
// Typed event aliases
// ---------------------------------------------------------------------------

export type PhaseStartedEvent    = DomainEvent<PhaseStartedPayload>;
export type PhaseCompletedEvent  = DomainEvent<PhaseCompletedPayload>;
export type GateApprovedEvent    = DomainEvent<GateApprovedPayload>;
export type GateRejectedEvent    = DomainEvent<GateRejectedPayload>;
export type ArtifactCreatedEvent   = DomainEvent<ArtifactCreatedPayload>;
export type ArtifactUpdatedEvent   = DomainEvent<ArtifactUpdatedPayload>;
export type ArtifactValidatedEvent = DomainEvent<ArtifactValidatedPayload>;
export type BlueprintGeneratedEvent  = DomainEvent<BlueprintGeneratedPayload>;
export type BlueprintValidatedEvent  = DomainEvent<BlueprintValidatedPayload>;
export type WorkflowUpdatedEvent     = DomainEvent<WorkflowUpdatedPayload>;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export const DomainEvents = {
  phaseStarted(payload: PhaseStartedPayload, correlationId?: string): PhaseStartedEvent {
    return createEvent(EVENT_TYPES.PHASE_STARTED, 1, payload, correlationId);
  },
  phaseCompleted(payload: PhaseCompletedPayload, correlationId?: string): PhaseCompletedEvent {
    return createEvent(EVENT_TYPES.PHASE_COMPLETED, 1, payload, correlationId);
  },
  gateApproved(payload: GateApprovedPayload, correlationId?: string): GateApprovedEvent {
    return createEvent(EVENT_TYPES.GATE_APPROVED, 1, payload, correlationId);
  },
  gateRejected(payload: GateRejectedPayload, correlationId?: string): GateRejectedEvent {
    return createEvent(EVENT_TYPES.GATE_REJECTED, 1, payload, correlationId);
  },
  artifactCreated(payload: ArtifactCreatedPayload, correlationId?: string): ArtifactCreatedEvent {
    return createEvent(EVENT_TYPES.ARTIFACT_CREATED, 1, payload, correlationId);
  },
  artifactUpdated(payload: ArtifactUpdatedPayload, correlationId?: string): ArtifactUpdatedEvent {
    return createEvent(EVENT_TYPES.ARTIFACT_UPDATED, 1, payload, correlationId);
  },
  artifactValidated(payload: ArtifactValidatedPayload, correlationId?: string): ArtifactValidatedEvent {
    return createEvent(EVENT_TYPES.ARTIFACT_VALIDATED, 1, payload, correlationId);
  },
  blueprintGenerated(payload: BlueprintGeneratedPayload, correlationId?: string): BlueprintGeneratedEvent {
    return createEvent(EVENT_TYPES.BLUEPRINT_GENERATED, 1, payload, correlationId);
  },
  blueprintValidated(payload: BlueprintValidatedPayload, correlationId?: string): BlueprintValidatedEvent {
    return createEvent(EVENT_TYPES.BLUEPRINT_VALIDATED, 1, payload, correlationId);
  },
  workflowUpdated(payload: WorkflowUpdatedPayload, correlationId?: string): WorkflowUpdatedEvent {
    return createEvent(EVENT_TYPES.WORKFLOW_UPDATED, 1, payload, correlationId);
  },
} as const;
