import {
  ArtifactStateMachine,
  ArtifactState,
  ARTIFACT_TRANSITIONS,
} from './artifact-state-machine';

describe('ArtifactStateMachine', () => {
  let machine: ArtifactStateMachine;

  beforeEach(() => {
    machine = new ArtifactStateMachine();
  });

  describe('ARTIFACT_TRANSITIONS', () => {
    it('defines transitions for all states', () => {
      expect(Object.keys(ARTIFACT_TRANSITIONS)).toHaveLength(6);
    });

    it('ARCHIVED has no outgoing transitions', () => {
      expect(ARTIFACT_TRANSITIONS[ArtifactState.ARCHIVED]).toEqual([]);
    });

    it('DRAFT can go to SUBMITTED or ARCHIVED', () => {
      expect(ARTIFACT_TRANSITIONS[ArtifactState.DRAFT]).toContain(ArtifactState.SUBMITTED);
      expect(ARTIFACT_TRANSITIONS[ArtifactState.DRAFT]).toContain(ArtifactState.ARCHIVED);
    });
  });

  describe('transition', () => {
    it('allows DRAFT → SUBMITTED', () => {
      expect(machine.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED)).toBe(true);
    });

    it('allows SUBMITTED → VALIDATING', () => {
      expect(machine.transition(ArtifactState.SUBMITTED, ArtifactState.VALIDATING)).toBe(true);
    });

    it('allows VALIDATING → VALIDATED', () => {
      expect(machine.transition(ArtifactState.VALIDATING, ArtifactState.VALIDATED)).toBe(true);
    });

    it('allows VALIDATING → REJECTED', () => {
      expect(machine.transition(ArtifactState.VALIDATING, ArtifactState.REJECTED)).toBe(true);
    });

    it('allows REJECTED → DRAFT (rework)', () => {
      expect(machine.transition(ArtifactState.REJECTED, ArtifactState.DRAFT)).toBe(true);
    });

    it('throws on invalid transition', () => {
      expect(() => machine.transition(ArtifactState.DRAFT, ArtifactState.VALIDATED)).toThrow('Invalid artifact transition');
    });

    it('throws on ARCHIVED → anything', () => {
      expect(() => machine.transition(ArtifactState.ARCHIVED, ArtifactState.DRAFT)).toThrow('Invalid artifact transition');
    });

    it('emits artifactUpdated event when eventBus is provided', () => {
      const publish = jest.fn();
      const eventBus = { publish } as any;
      const machineWithEvents = new ArtifactStateMachine(eventBus);

      machineWithEvents.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED, {
        artifactPath: '/test/adr.md',
        projectId: 'proj-1',
      });

      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('does not emit events when no eventBus', () => {
      expect(machine.transition(ArtifactState.DRAFT, ArtifactState.SUBMITTED)).toBe(true);
    });
  });

  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(machine.canTransition(ArtifactState.DRAFT, ArtifactState.SUBMITTED)).toBe(true);
      expect(machine.canTransition(ArtifactState.VALIDATING, ArtifactState.VALIDATED)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(machine.canTransition(ArtifactState.DRAFT, ArtifactState.VALIDATED)).toBe(false);
      expect(machine.canTransition(ArtifactState.ARCHIVED, ArtifactState.DRAFT)).toBe(false);
    });
  });

  describe('allowedTransitions', () => {
    it('returns correct targets for DRAFT', () => {
      const allowed = machine.allowedTransitions(ArtifactState.DRAFT);
      expect(allowed).toContain(ArtifactState.SUBMITTED);
      expect(allowed).toContain(ArtifactState.ARCHIVED);
    });

    it('returns empty array for ARCHIVED', () => {
      const allowed = machine.allowedTransitions(ArtifactState.ARCHIVED);
      expect(allowed).toEqual([]);
    });
  });
});
