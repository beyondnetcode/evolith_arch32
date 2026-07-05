import {
  ArtifactState,
  ArtifactStateMachine,
  ARTIFACT_TRANSITIONS,
} from './artifact-state-machine';
import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../events/domain-event';

const ctx = {
  artifactPath: 'docs/adr/0001-init.md',
  artifactType: 'adr',
  projectId: 'proj-test',
};

describe('ArtifactStateMachine', () => {
  describe('ARTIFACT_TRANSITIONS map', () => {
    it('covers every ArtifactState as a key', () => {
      const states = Object.values(ArtifactState);
      states.forEach(s => {
        expect(ARTIFACT_TRANSITIONS).toHaveProperty(s);
      });
    });

    it('ARCHIVED has no outgoing transitions', () => {
      expect(ARTIFACT_TRANSITIONS[ArtifactState.ARCHIVED]).toHaveLength(0);
    });
  });

  describe('canTransition()', () => {
    const sm = new ArtifactStateMachine();

    it('allows DRAFT → SUBMITTED', () => {
      expect(sm.canTransition(ArtifactState.DRAFT, ArtifactState.SUBMITTED)).toBe(true);
    });

    it('allows SUBMITTED → VALIDATING', () => {
      expect(sm.canTransition(ArtifactState.SUBMITTED, ArtifactState.VALIDATING)).toBe(true);
    });

    it('allows VALIDATING → VALIDATED', () => {
      expect(sm.canTransition(ArtifactState.VALIDATING, ArtifactState.VALIDATED)).toBe(true);
    });

    it('allows VALIDATING → REJECTED', () => {
      expect(sm.canTransition(ArtifactState.VALIDATING, ArtifactState.REJECTED)).toBe(true);
    });

    it('allows REJECTED → DRAFT', () => {
      expect(sm.canTransition(ArtifactState.REJECTED, ArtifactState.DRAFT)).toBe(true);
    });

    it('allows VALIDATED → ARCHIVED', () => {
      expect(sm.canTransition(ArtifactState.VALIDATED, ArtifactState.ARCHIVED)).toBe(true);
    });

    it('disallows DRAFT → VALIDATED (skip step)', () => {
      expect(sm.canTransition(ArtifactState.DRAFT, ArtifactState.VALIDATED)).toBe(false);
    });

    it('disallows ARCHIVED → DRAFT', () => {
      expect(sm.canTransition(ArtifactState.ARCHIVED, ArtifactState.DRAFT)).toBe(false);
    });
  });

  describe('transition()', () => {
    it('returns true on valid transition', () => {
      const sm = new ArtifactStateMachine();
      expect(sm.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED, ctx)).toBe(true);
    });

    it('throws on invalid transition', () => {
      const sm = new ArtifactStateMachine();
      expect(() =>
        sm.transition(ArtifactState.DRAFT, ArtifactState.VALIDATED, ctx),
      ).toThrow(/Invalid artifact transition/);
    });

    it('throws descriptive message with allowed targets', () => {
      const sm = new ArtifactStateMachine();
      expect(() =>
        sm.transition(ArtifactState.ARCHIVED, ArtifactState.DRAFT),
      ).toThrow(/Allowed targets from ARCHIVED: \[none\]/);
    });
  });

  describe('event emission', () => {
    it('publishes artifact.updated event on valid transition', async () => {
      const published: DomainEvent<unknown>[] = [];
      const mockBus: IDomainEventBus = {
        publish: jest.fn(async (e) => { published.push(e); }),
        subscribe: jest.fn(),
      };

      const sm = new ArtifactStateMachine(mockBus);
      sm.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED, ctx);

      // allow micro-task to flush
      await Promise.resolve();

      expect(mockBus.publish).toHaveBeenCalledTimes(1);
      const event = published[0]!;
      expect(event.eventType).toBe('artifact.updated');
      expect((event.payload as { artifactPath: string }).artifactPath).toBe(ctx.artifactPath);
    });

    it('does not publish when no context is provided', async () => {
      const mockBus: IDomainEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn(),
      };

      const sm = new ArtifactStateMachine(mockBus);
      sm.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED);

      await Promise.resolve();
      expect(mockBus.publish).not.toHaveBeenCalled();
    });

    it('does not publish when no bus is injected', async () => {
      const sm = new ArtifactStateMachine(); // no bus
      // should not throw
      expect(() => sm.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED, ctx)).not.toThrow();
    });
  });

  describe('allowedTransitions()', () => {
    it('returns all valid targets from SUBMITTED', () => {
      const sm = new ArtifactStateMachine();
      const targets = sm.allowedTransitions(ArtifactState.SUBMITTED);
      expect(targets).toContain(ArtifactState.VALIDATING);
      expect(targets).toContain(ArtifactState.DRAFT);
    });

    it('returns empty array from ARCHIVED', () => {
      const sm = new ArtifactStateMachine();
      expect(sm.allowedTransitions(ArtifactState.ARCHIVED)).toHaveLength(0);
    });
  });
});
