import {
  DomainEvents,
  EVENT_TYPES,
  type EventType,
} from './domain-events';
import { createEvent } from './domain-event';

describe('domain-events', () => {
  describe('EVENT_TYPES', () => {
    it('has all expected event types', () => {
      expect(EVENT_TYPES.PHASE_STARTED).toBe('phase.started');
      expect(EVENT_TYPES.PHASE_COMPLETED).toBe('phase.completed');
      expect(EVENT_TYPES.GATE_APPROVED).toBe('gate.approved');
      expect(EVENT_TYPES.GATE_REJECTED).toBe('gate.rejected');
      expect(EVENT_TYPES.ARTIFACT_CREATED).toBe('artifact.created');
      expect(EVENT_TYPES.ARTIFACT_UPDATED).toBe('artifact.updated');
      expect(EVENT_TYPES.ARTIFACT_VALIDATED).toBe('artifact.validated');
      expect(EVENT_TYPES.BLUEPRINT_GENERATED).toBe('blueprint.generated');
      expect(EVENT_TYPES.BLUEPRINT_VALIDATED).toBe('blueprint.validated');
      expect(EVENT_TYPES.WORKFLOW_UPDATED).toBe('workflow.updated');
    });

    it('has 10 event types', () => {
      expect(Object.keys(EVENT_TYPES)).toHaveLength(10);
    });
  });

  describe('createEvent', () => {
    it('creates event with correct structure', () => {
      const event = createEvent('test.event', 1, { key: 'value' });
      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe('test.event');
      expect(event.version).toBe(1);
      expect(event.occurredAt).toBeDefined();
      expect(event.payload).toEqual({ key: 'value' });
    });

    it('includes correlationId when provided', () => {
      const event = createEvent('test.event', 1, {}, 'corr-123');
      expect(event.correlationId).toBe('corr-123');
    });

    it('omits correlationId when not provided', () => {
      const event = createEvent('test.event', 1, {});
      expect(event.correlationId).toBeUndefined();
    });

    it('generates unique eventIds', () => {
      const e1 = createEvent('test.event', 1, {});
      const e2 = createEvent('test.event', 1, {});
      expect(e1.eventId).not.toBe(e2.eventId);
    });
  });

  describe('DomainEvents factory', () => {
    it('creates phaseStarted event', () => {
      const event = DomainEvents.phaseStarted({ projectId: 'p1', phase: 'discovery' });
      expect(event.eventType).toBe(EVENT_TYPES.PHASE_STARTED);
      expect(event.payload.projectId).toBe('p1');
      expect(event.payload.phase).toBe('discovery');
    });

    it('creates phaseCompleted event', () => {
      const event = DomainEvents.phaseCompleted({ projectId: 'p1', phase: 'design', completedAt: '2026-01-01' });
      expect(event.eventType).toBe(EVENT_TYPES.PHASE_COMPLETED);
      expect(event.payload.completedAt).toBe('2026-01-01');
    });

    it('creates gateApproved event', () => {
      const event = DomainEvents.gateApproved({
        projectId: 'p1', phase: 'construction', gateId: 'gate-f3',
        rulesetRef: 'ruleset-1', evaluatedBy: 'ci', evaluatedAt: '2026-01-01',
      });
      expect(event.eventType).toBe(EVENT_TYPES.GATE_APPROVED);
    });

    it('creates gateRejected event', () => {
      const event = DomainEvents.gateRejected({
        projectId: 'p1', phase: 'qa', gateId: 'gate-f4',
        rulesetRef: 'ruleset-1', evaluatedBy: 'human', evaluatedAt: '2026-01-01',
        violations: [],
      });
      expect(event.eventType).toBe(EVENT_TYPES.GATE_REJECTED);
    });

    it('creates artifactCreated event', () => {
      const event = DomainEvents.artifactCreated({ projectId: 'p1', artifactId: 'a1', artifactType: 'adr' });
      expect(event.eventType).toBe(EVENT_TYPES.ARTIFACT_CREATED);
    });

    it('creates workflowUpdated event', () => {
      const event = DomainEvents.workflowUpdated({ projectId: 'p1', workflowId: 'w1' });
      expect(event.eventType).toBe(EVENT_TYPES.WORKFLOW_UPDATED);
    });

    it('passes correlationId to underlying createEvent', () => {
      const event = DomainEvents.phaseStarted({ projectId: 'p1', phase: 'discovery' }, 'trace-123');
      expect(event.correlationId).toBe('trace-123');
    });
  });
});
