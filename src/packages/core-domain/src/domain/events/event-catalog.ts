/**
 * Versioned event catalog — the consumable registry of every domain event
 * emitted by Evolith Core.
 *
 * Usage:
 *   import { EVENT_CATALOG } from '@beyondnet/evolith-core-domain';
 *   const entry = EVENT_CATALOG['gate.approved'];
 *   console.log(entry.description, entry.version);
 *
 * Add a new entry here whenever a new event type is introduced.
 * Bumping `version` signals a breaking payload change.
 */
import { EVENT_TYPES } from './domain-events';

export interface EventCatalogEntry {
  /** Stable event type string. */
  eventType: string;
  /** Current schema version. */
  version: number;
  /** Human-readable description of when this event is emitted. */
  description: string;
  /** Example payload shape (informational). */
  examplePayload: Record<string, unknown>;
}

export const EVENT_CATALOG: Record<string, EventCatalogEntry> = {
  [EVENT_TYPES.PHASE_STARTED]: {
    eventType: EVENT_TYPES.PHASE_STARTED,
    version: 1,
    description: 'Emitted when an SDLC phase transition begins for a project.',
    examplePayload: { projectId: 'proj-123', phase: 'design', startedBy: 'agent' },
  },
  [EVENT_TYPES.PHASE_COMPLETED]: {
    eventType: EVENT_TYPES.PHASE_COMPLETED,
    version: 1,
    description: 'Emitted when an SDLC phase has been fully completed.',
    examplePayload: { projectId: 'proj-123', phase: 'design', completedAt: '2026-06-26T00:00:00Z' },
  },
  [EVENT_TYPES.GATE_APPROVED]: {
    eventType: EVENT_TYPES.GATE_APPROVED,
    version: 1,
    description: 'Emitted when a phase gate evaluation passes (verdict = passed).',
    examplePayload: {
      projectId: 'proj-123',
      phase: 'design',
      gateId: 'design-gate',
      rulesetRef: 'rulesets/sdlc/phase-gates.rules.json',
      evaluatedBy: 'ci',
      evaluatedAt: '2026-06-26T00:00:00Z',
    },
  },
  [EVENT_TYPES.GATE_REJECTED]: {
    eventType: EVENT_TYPES.GATE_REJECTED,
    version: 1,
    description: 'Emitted when a phase gate evaluation fails (verdict = failed).',
    examplePayload: {
      projectId: 'proj-123',
      phase: 'design',
      gateId: 'design-gate',
      rulesetRef: 'rulesets/sdlc/phase-gates.rules.json',
      evaluatedBy: 'ci',
      evaluatedAt: '2026-06-26T00:00:00Z',
      violationCount: 3,
    },
  },
  [EVENT_TYPES.ARTIFACT_CREATED]: {
    eventType: EVENT_TYPES.ARTIFACT_CREATED,
    version: 1,
    description: 'Emitted when a tracked artifact is created in the project.',
    examplePayload: { projectId: 'proj-123', artifactPath: 'docs/adr/0001-init.md', artifactType: 'adr' },
  },
  [EVENT_TYPES.ARTIFACT_UPDATED]: {
    eventType: EVENT_TYPES.ARTIFACT_UPDATED,
    version: 1,
    description: 'Emitted when a tracked artifact is modified.',
    examplePayload: { projectId: 'proj-123', artifactPath: 'docs/adr/0001-init.md', artifactType: 'adr' },
  },
  [EVENT_TYPES.ARTIFACT_VALIDATED]: {
    eventType: EVENT_TYPES.ARTIFACT_VALIDATED,
    version: 1,
    description: 'Emitted after an artifact has been validated against its schema or ruleset.',
    examplePayload: { projectId: 'proj-123', artifactPath: 'docs/adr/0001-init.md', passed: true, validatedAt: '2026-06-26T00:00:00Z' },
  },
  [EVENT_TYPES.BLUEPRINT_GENERATED]: {
    eventType: EVENT_TYPES.BLUEPRINT_GENERATED,
    version: 1,
    description: 'Emitted when an architecture blueprint is generated for a project.',
    examplePayload: { projectId: 'proj-123', blueprintId: 'bp-abc', generatedAt: '2026-06-26T00:00:00Z' },
  },
  [EVENT_TYPES.BLUEPRINT_VALIDATED]: {
    eventType: EVENT_TYPES.BLUEPRINT_VALIDATED,
    version: 1,
    description: 'Emitted after a blueprint has been validated.',
    examplePayload: { projectId: 'proj-123', blueprintId: 'bp-abc', passed: true, validatedAt: '2026-06-26T00:00:00Z' },
  },
  [EVENT_TYPES.WORKFLOW_UPDATED]: {
    eventType: EVENT_TYPES.WORKFLOW_UPDATED,
    version: 1,
    description: 'Emitted when the SDLC workflow definition for a project is updated.',
    examplePayload: { projectId: 'proj-123', workflowId: 'wf-default', updatedAt: '2026-06-26T00:00:00Z', changedFields: ['phases'] },
  },
};
