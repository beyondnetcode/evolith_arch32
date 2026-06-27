import {
  PhaseState,
  PhaseStateMachine,
  PHASE_TRANSITIONS,
} from './phase-state-machine';
import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../events/domain-event';

const ctx = {
  projectId: 'proj-test',
  phase: 'design' as const,
  startedBy: 'agent',
};

describe('PhaseStateMachine', () => {
  describe('PHASE_TRANSITIONS map', () => {
    it('covers every PhaseState as a key', () => {
      Object.values(PhaseState).forEach(s => {
        expect(PHASE_TRANSITIONS).toHaveProperty(s);
      });
    });

    it('ARCHIVED has no outgoing transitions', () => {
      expect(PHASE_TRANSITIONS[PhaseState.ARCHIVED]).toHaveLength(0);
    });
  });

  describe('canTransition()', () => {
    const sm = new PhaseStateMachine();

    it('allows PENDING → IN_PROGRESS', () => {
      expect(sm.canTransition(PhaseState.PENDING, PhaseState.IN_PROGRESS)).toBe(true);
    });

    it('allows IN_PROGRESS → GATE_PENDING', () => {
      expect(sm.canTransition(PhaseState.IN_PROGRESS, PhaseState.GATE_PENDING)).toBe(true);
    });

    it('allows GATE_PENDING → APPROVED', () => {
      expect(sm.canTransition(PhaseState.GATE_PENDING, PhaseState.APPROVED)).toBe(true);
    });

    it('allows GATE_PENDING → REJECTED', () => {
      expect(sm.canTransition(PhaseState.GATE_PENDING, PhaseState.REJECTED)).toBe(true);
    });

    it('allows REJECTED → IN_PROGRESS', () => {
      expect(sm.canTransition(PhaseState.REJECTED, PhaseState.IN_PROGRESS)).toBe(true);
    });

    it('allows APPROVED → ARCHIVED', () => {
      expect(sm.canTransition(PhaseState.APPROVED, PhaseState.ARCHIVED)).toBe(true);
    });

    it('disallows PENDING → APPROVED (skip gate)', () => {
      expect(sm.canTransition(PhaseState.PENDING, PhaseState.APPROVED)).toBe(false);
    });

    it('disallows ARCHIVED → PENDING', () => {
      expect(sm.canTransition(PhaseState.ARCHIVED, PhaseState.PENDING)).toBe(false);
    });
  });

  describe('transition()', () => {
    it('returns true on valid transition', () => {
      const sm = new PhaseStateMachine();
      expect(sm.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS, ctx)).toBe(true);
    });

    it('throws on invalid transition', () => {
      const sm = new PhaseStateMachine();
      expect(() =>
        sm.transition(PhaseState.PENDING, PhaseState.APPROVED, ctx),
      ).toThrow(/Invalid phase transition/);
    });

    it('throws with descriptive message', () => {
      const sm = new PhaseStateMachine();
      expect(() =>
        sm.transition(PhaseState.ARCHIVED, PhaseState.PENDING),
      ).toThrow(/Allowed targets from ARCHIVED: \[none\]/);
    });
  });

  describe('event emission', () => {
    it('emits phase.started when transitioning to IN_PROGRESS', async () => {
      const published: DomainEvent<unknown>[] = [];
      const mockBus: IDomainEventBus = {
        publish: jest.fn(async (e) => { published.push(e); }),
        subscribe: jest.fn(),
      };

      const sm = new PhaseStateMachine(mockBus);
      sm.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS, ctx);
      await Promise.resolve();

      expect(mockBus.publish).toHaveBeenCalledTimes(1);
      expect(published[0]!.eventType).toBe('phase.started');
    });

    it('emits phase.completed when transitioning to APPROVED', async () => {
      const published: DomainEvent<unknown>[] = [];
      const mockBus: IDomainEventBus = {
        publish: jest.fn(async (e) => { published.push(e); }),
        subscribe: jest.fn(),
      };

      const sm = new PhaseStateMachine(mockBus);
      sm.transition(PhaseState.GATE_PENDING, PhaseState.APPROVED, ctx);
      await Promise.resolve();

      expect(mockBus.publish).toHaveBeenCalledTimes(1);
      expect(published[0]!.eventType).toBe('phase.completed');
    });

    it('does not emit for transitions that have no mapped event', async () => {
      const mockBus: IDomainEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn(),
      };

      const sm = new PhaseStateMachine(mockBus);
      sm.transition(PhaseState.IN_PROGRESS, PhaseState.GATE_PENDING, ctx);
      await Promise.resolve();

      expect(mockBus.publish).not.toHaveBeenCalled();
    });

    it('does not emit when no context supplied', async () => {
      const mockBus: IDomainEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn(),
      };

      const sm = new PhaseStateMachine(mockBus);
      sm.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS);
      await Promise.resolve();

      expect(mockBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('allowedTransitions()', () => {
    it('returns correct targets from IN_PROGRESS', () => {
      const sm = new PhaseStateMachine();
      const targets = sm.allowedTransitions(PhaseState.IN_PROGRESS);
      expect(targets).toContain(PhaseState.GATE_PENDING);
      expect(targets).toContain(PhaseState.PENDING);
    });
  });
});
