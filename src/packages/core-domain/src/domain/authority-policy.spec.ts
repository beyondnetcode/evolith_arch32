import {
  isHumanAuthority,
  isAssertive,
  isAuthoritative,
  isValidPromotion,
  evaluateAuthority,
  PROMOTION_SEQUENCE,
  PROMOTION_AUTHORITY,
  type Actor,
  type Artefact,
  type AuthorityRequest,
} from './authority-policy';

describe('authority-policy', () => {
  describe('isHumanAuthority', () => {
    it('returns true for human actors', () => {
      expect(isHumanAuthority({ id: 'u1', kind: 'human' })).toBe(true);
      expect(isHumanAuthority({ id: 'c1', kind: 'custodian' })).toBe(true);
      expect(isHumanAuthority({ id: 'b1', kind: 'board' })).toBe(true);
    });

    it('returns false for non-human actors', () => {
      expect(isHumanAuthority({ id: 'a1', kind: 'agent' })).toBe(false);
      expect(isHumanAuthority({ id: 'e1', kind: 'engine' })).toBe(false);
      expect(isHumanAuthority({ id: 'ci1', kind: 'ci' })).toBe(false);
    });
  });

  describe('isAssertive / isAuthoritative', () => {
    it('classifies assertive actions', () => {
      expect(isAssertive('observe')).toBe(true);
      expect(isAssertive('recommend')).toBe(true);
      expect(isAssertive('attach-evidence')).toBe(true);
      expect(isAssertive('draft-candidate')).toBe(true);
      expect(isAuthoritative('observe')).toBe(false);
    });

    it('classifies authoritative actions', () => {
      expect(isAuthoritative('accept')).toBe(true);
      expect(isAuthoritative('promote')).toBe(true);
      expect(isAuthoritative('ratify')).toBe(true);
      expect(isAuthoritative('waive')).toBe(true);
      expect(isAuthoritative('enforce')).toBe(true);
      expect(isAssertive('accept')).toBe(false);
    });
  });

  describe('isValidPromotion', () => {
    it('allows sequential promotions', () => {
      expect(isValidPromotion('candidate', 'evaluated')).toBe(true);
      expect(isValidPromotion('evaluated', 'accepted')).toBe(true);
      expect(isValidPromotion('accepted', 'executable')).toBe(true);
    });

    it('rejects skipping stages', () => {
      expect(isValidPromotion('candidate', 'accepted')).toBe(false);
      expect(isValidPromotion('candidate', 'executable')).toBe(false);
      expect(isValidPromotion('evaluated', 'executable')).toBe(false);
    });

    it('rejects backward promotions', () => {
      expect(isValidPromotion('accepted', 'evaluated')).toBe(false);
      expect(isValidPromotion('executable', 'candidate')).toBe(false);
    });

    it('retired is always a valid target from any non-terminal state', () => {
      expect(isValidPromotion('candidate', 'retired')).toBe(true);
      expect(isValidPromotion('evaluated', 'retired')).toBe(true);
      expect(isValidPromotion('accepted', 'retired')).toBe(true);
      expect(isValidPromotion('executable', 'retired')).toBe(true);
    });

    it('rejects promotion from terminal state', () => {
      expect(isValidPromotion('retired', 'candidate')).toBe(false);
    });
  });

  describe('evaluateAuthority', () => {
    const agent: Actor = { id: 'agent-1', kind: 'agent' };
    const human: Actor = { id: 'user-1', kind: 'human' };
    const board: Actor = { id: 'board-1', kind: 'board' };
    const artefact: Artefact = { id: 'adr-001', kind: 'adr', authoredBy: 'user-1' };

    it('AP-R01: assertions are always permitted', () => {
      const result = evaluateAuthority({
        actor: agent,
        action: 'observe',
        artefact,
      });
      expect(result.permitted).toBe(true);
      expect(result.rule).toBe('AP-R01');
    });

    it('AP-R01: agents can recommend', () => {
      const result = evaluateAuthority({
        actor: agent,
        action: 'recommend',
        artefact,
      });
      expect(result.permitted).toBe(true);
      expect(result.rule).toBe('AP-R01');
    });

    it('AP-R03: agent cannot ratify its own output', () => {
      const result = evaluateAuthority({
        actor: agent, // agent-1 authored the artefact
        action: 'ratify',
        artefact: { id: 'finding-1', kind: 'finding', authoredBy: 'agent-1' },
      });
      expect(result.permitted).toBe(false);
      expect(result.rule).toBe('AP-R03');
    });

    it('AP-R03: human CAN ratify their own output', () => {
      const result = evaluateAuthority({
        actor: human,
        action: 'ratify',
        artefact: { id: 'decision-1', kind: 'decision', authoredBy: 'user-1' },
      });
      expect(result.permitted).toBe(true);
    });

    it('AP-R02: non-human cannot perform authoritative actions', () => {
      const result = evaluateAuthority({
        actor: agent,
        action: 'ratify',
        artefact: { id: 'finding-1', kind: 'finding' },
      });
      expect(result.permitted).toBe(false);
      expect(result.rule).toBe('AP-R02');
    });

    it('AP-R02: human CAN perform authoritative actions', () => {
      const result = evaluateAuthority({
        actor: human,
        action: 'ratify',
        artefact: { id: 'finding-1', kind: 'finding' },
      });
      expect(result.permitted).toBe(true);
      expect(result.rule).toBe('AP-R06');
    });

    it('AP-R04: promote requires target status', () => {
      const result = evaluateAuthority({
        actor: board,
        action: 'promote',
        artefact,
      });
      expect(result.permitted).toBe(false);
      expect(result.rule).toBe('AP-R04');
    });

    it('AP-R04: promote with valid target is permitted', () => {
      const result = evaluateAuthority({
        actor: board,
        action: 'promote',
        artefact,
        targetStatus: 'evaluated',
      });
      expect(result.permitted).toBe(true);
    });

    it('AP-R05: promotion authority is restricted per stage', () => {
      // Only board can move to 'accepted'
      const agentResult = evaluateAuthority({
        actor: agent,
        action: 'promote',
        artefact: { id: 'adr-002', kind: 'adr', status: 'evaluated' },
        targetStatus: 'accepted',
      });
      expect(agentResult.permitted).toBe(false);
      expect(agentResult.rule).toBe('AP-R02');

      const boardResult = evaluateAuthority({
        actor: board,
        action: 'promote',
        artefact: { id: 'adr-002', kind: 'adr', status: 'evaluated' },
        targetStatus: 'accepted',
      });
      expect(boardResult.permitted).toBe(true);
    });
  });

  describe('PROMOTION_SEQUENCE', () => {
    it('has exactly 4 stages', () => {
      expect(PROMOTION_SEQUENCE).toHaveLength(4);
    });

    it('starts with candidate and ends with executable', () => {
      expect(PROMOTION_SEQUENCE[0]).toBe('candidate');
      expect(PROMOTION_SEQUENCE[PROMOTION_SEQUENCE.length - 1]).toBe('executable');
    });
  });

  describe('PROMOTION_AUTHORITY', () => {
    it('candidate is open to all actors', () => {
      expect(PROMOTION_AUTHORITY.candidate).toContain('agent');
      expect(PROMOTION_AUTHORITY.candidate).toContain('human');
      expect(PROMOTION_AUTHORITY.candidate).toContain('board');
    });

    it('accepted is restricted to board only', () => {
      expect(PROMOTION_AUTHORITY.accepted).toEqual(['board']);
    });

    it('executable is restricted to board only', () => {
      expect(PROMOTION_AUTHORITY.executable).toEqual(['board']);
    });
  });
});
