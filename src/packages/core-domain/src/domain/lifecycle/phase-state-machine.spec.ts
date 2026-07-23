import {
  PhaseStateMachine,
  PhaseState,
  PHASE_TRANSITIONS,
} from './phase-state-machine';

describe('PhaseStateMachine', () => {
  let machine: PhaseStateMachine;

  beforeEach(() => {
    machine = new PhaseStateMachine();
  });

  describe('PHASE_TRANSITIONS', () => {
    it('defines transitions for all states', () => {
      expect(Object.keys(PHASE_TRANSITIONS)).toHaveLength(6);
      expect(PHASE_TRANSITIONS[PhaseState.PENDING]).toBeDefined();
      expect(PHASE_TRANSITIONS[PhaseState.IN_PROGRESS]).toBeDefined();
      expect(PHASE_TRANSITIONS[PhaseState.GATE_PENDING]).toBeDefined();
      expect(PHASE_TRANSITIONS[PhaseState.APPROVED]).toBeDefined();
      expect(PHASE_TRANSITIONS[PhaseState.REJECTED]).toBeDefined();
      expect(PHASE_TRANSITIONS[PhaseState.ARCHIVED]).toBeDefined();
    });

    it('ARCHIVED has no outgoing transitions', () => {
      expect(PHASE_TRANSITIONS[PhaseState.ARCHIVED]).toEqual([]);
    });
  });

  describe('transition', () => {
    it('allows PENDING → IN_PROGRESS', () => {
      expect(machine.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS)).toBe(true);
    });

    it('allows IN_PROGRESS → GATE_PENDING', () => {
      expect(machine.transition(PhaseState.IN_PROGRESS, PhaseState.GATE_PENDING)).toBe(true);
    });

    it('allows GATE_PENDING → APPROVED', () => {
      expect(machine.transition(PhaseState.GATE_PENDING, PhaseState.APPROVED)).toBe(true);
    });

    it('allows GATE_PENDING → REJECTED', () => {
      expect(machine.transition(PhaseState.GATE_PENDING, PhaseState.REJECTED)).toBe(true);
    });

    it('allows REJECTED → IN_PROGRESS (rework)', () => {
      expect(machine.transition(PhaseState.REJECTED, PhaseState.IN_PROGRESS)).toBe(true);
    });

    it('throws on invalid transition', () => {
      expect(() => machine.transition(PhaseState.PENDING, PhaseState.APPROVED)).toThrow('Invalid phase transition');
    });

    it('throws on ARCHIVED → anything', () => {
      expect(() => machine.transition(PhaseState.ARCHIVED, PhaseState.PENDING)).toThrow('Invalid phase transition');
    });

    it('emits phase.started event when transitioning to IN_PROGRESS', () => {
      const publish = jest.fn();
      const eventBus = { publish } as any;
      const machineWithEvents = new PhaseStateMachine(eventBus);

      machineWithEvents.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS, {
        projectId: 'proj-1',
        phase: 'discovery',
      });

      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('emits phase.completed event when transitioning to APPROVED', () => {
      const publish = jest.fn();
      const eventBus = { publish } as any;
      const machineWithEvents = new PhaseStateMachine(eventBus);

      machineWithEvents.transition(PhaseState.GATE_PENDING, PhaseState.APPROVED, {
        projectId: 'proj-1',
        phase: 'design',
      });

      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('does not emit events when no eventBus', () => {
      // No eventBus constructor arg — should not throw
      expect(machine.transition(PhaseState.PENDING, PhaseState.IN_PROGRESS)).toBe(true);
    });
  });

  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(machine.canTransition(PhaseState.PENDING, PhaseState.IN_PROGRESS)).toBe(true);
      expect(machine.canTransition(PhaseState.IN_PROGRESS, PhaseState.GATE_PENDING)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(machine.canTransition(PhaseState.PENDING, PhaseState.APPROVED)).toBe(false);
      expect(machine.canTransition(PhaseState.ARCHIVED, PhaseState.PENDING)).toBe(false);
    });
  });

  describe('allowedTransitions', () => {
    it('returns allowed targets for PENDING', () => {
      const allowed = machine.allowedTransitions(PhaseState.PENDING);
      expect(allowed).toContain(PhaseState.IN_PROGRESS);
      expect(allowed).toContain(PhaseState.ARCHIVED);
      expect(allowed).not.toContain(PhaseState.APPROVED);
    });

    it('returns empty array for ARCHIVED', () => {
      const allowed = machine.allowedTransitions(PhaseState.ARCHIVED);
      expect(allowed).toEqual([]);
    });

    it('returns correct targets for REJECTED', () => {
      const allowed = machine.allowedTransitions(PhaseState.REJECTED);
      expect(allowed).toContain(PhaseState.IN_PROGRESS);
      expect(allowed).toContain(PhaseState.ARCHIVED);
    });
  });
});
