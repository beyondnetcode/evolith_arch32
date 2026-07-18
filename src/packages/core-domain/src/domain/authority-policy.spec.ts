import {
  Actor,
  AuthorityRequest,
  AuthorityViolationError,
  PROMOTION_AUTHORITY,
  PROMOTION_SEQUENCE,
  evaluateAuthority,
  formatAuthorityDecision,
  isAssertive,
  isAuthoritative,
  isHumanAuthority,
  isPermitted,
  isValidPromotion,
  requireAuthority,
} from './authority-policy';

const agent: Actor = { id: 'winston-agent', kind: 'agent' };
const engine: Actor = { id: 'core-engine', kind: 'engine' };
const ci: Actor = { id: 'github-actions', kind: 'ci' };
const person: Actor = { id: 'dev@evolith', kind: 'human' };
const custodian: Actor = { id: '@winston', kind: 'custodian' };
const board: Actor = { id: 'architecture-board', kind: 'board' };

const req = (over: Partial<AuthorityRequest> & Pick<AuthorityRequest, 'actor' | 'action'>): AuthorityRequest => ({
  artefact: { id: 'KO-001', kind: 'KO-record' },
  ...over,
});

// ─── Assertion is open to everyone ──────────────────────────────────────────

describe('assertion', () => {
  it.each([agent, engine, ci, person, custodian, board])(
    'lets a $kind observe, recommend, attach evidence and draft a candidate',
    (actor) => {
      for (const action of ['observe', 'recommend', 'attach-evidence', 'draft-candidate'] as const) {
        expect(evaluateAuthority(req({ actor, action })).permitted).toBe(true);
      }
    },
  );

  it('lets an agent draft a candidate from its own finding', () => {
    const decision = evaluateAuthority(
      req({
        actor: agent,
        action: 'draft-candidate',
        artefact: { id: 'KO-002', kind: 'KO-record', authoredBy: agent.id },
      }),
    );
    expect(decision.permitted).toBe(true);
    expect(decision.rule).toBe('AP-R01');
  });

  it('classifies assertive and authoritative actions as mutually exclusive', () => {
    for (const action of ['observe', 'recommend', 'attach-evidence', 'draft-candidate'] as const) {
      expect(isAssertive(action)).toBe(true);
      expect(isAuthoritative(action)).toBe(false);
    }
    for (const action of ['accept', 'promote', 'ratify', 'waive', 'enforce'] as const) {
      expect(isAuthoritative(action)).toBe(true);
      expect(isAssertive(action)).toBe(false);
    }
  });
});

// ─── Self-authorization ─────────────────────────────────────────────────────

describe('self-authorization', () => {
  it('refuses an agent attempting to promote its own finding', () => {
    const decision = evaluateAuthority(
      req({
        actor: agent,
        action: 'promote',
        targetStatus: 'evaluated',
        artefact: { id: 'KO-003', kind: 'KO-record', status: 'candidate', authoredBy: agent.id },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R03');
    expect(decision.reason).toMatch(/certifies its own output is checked by nothing/);
  });

  it('refuses an engine attempting to ratify its own recommendation', () => {
    const decision = evaluateAuthority(
      req({
        actor: engine,
        action: 'ratify',
        artefact: { id: 'REC-1', kind: 'DecisionRecommendation', authoredBy: engine.id },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R03');
  });

  it('refuses an agent attempting to enforce a rule it derived itself', () => {
    const decision = evaluateAuthority(
      req({
        actor: agent,
        action: 'enforce',
        artefact: { id: 'RULE-9', kind: 'native-rule', authoredBy: agent.id },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R03');
  });

  it('reports self-authorization rather than non-humanity when both apply', () => {
    const own = evaluateAuthority(
      req({
        actor: agent,
        action: 'waive',
        artefact: { id: 'V-1', kind: 'violation', authoredBy: agent.id },
      }),
    );
    const other = evaluateAuthority(
      req({
        actor: agent,
        action: 'waive',
        artefact: { id: 'V-2', kind: 'violation', authoredBy: 'someone-else' },
      }),
    );
    expect(own.rule).toBe('AP-R03');
    expect(other.rule).toBe('AP-R02');
    expect(own.permitted).toBe(false);
    expect(other.permitted).toBe(false);
  });
});

// ─── Authority requires a human ─────────────────────────────────────────────

describe('acts of authority', () => {
  it.each([agent, engine, ci])('refuses a $kind attempting to accept, ratify, waive or enforce', (actor) => {
    for (const action of ['accept', 'ratify', 'waive', 'enforce'] as const) {
      const decision = evaluateAuthority(req({ actor, action }));
      expect(decision.permitted).toBe(false);
      expect(decision.rule).toBe('AP-R02');
    }
  });

  it('cites ADR-0101 when refusing a non-human actor', () => {
    const decision = evaluateAuthority(req({ actor: engine, action: 'ratify' }));
    expect(decision.citation).toMatch(/ADR-0101/);
  });

  it('defers the choice of office to RBAC once a human is established', () => {
    const decision = evaluateAuthority(
      req({ actor: person, action: 'waive', artefact: { id: 'V-3', kind: 'violation' } }),
    );
    expect(decision.permitted).toBe(true);
    expect(decision.rule).toBe('AP-R06');
    expect(decision.reason).toMatch(/domain\/rbac/);
  });

  it('treats human, custodian and board as human authority and the rest as not', () => {
    expect([person, custodian, board].every(isHumanAuthority)).toBe(true);
    expect([agent, engine, ci].some(isHumanAuthority)).toBe(false);
  });
});

// ─── Promotion lifecycle shape (ADR-0097) ───────────────────────────────────

describe('promotion lifecycle', () => {
  it('allows only the next stage in sequence', () => {
    expect(isValidPromotion('candidate', 'evaluated')).toBe(true);
    expect(isValidPromotion('evaluated', 'accepted')).toBe(true);
    expect(isValidPromotion('accepted', 'executable')).toBe(true);
  });

  it('refuses a skipped stage', () => {
    expect(isValidPromotion('candidate', 'accepted')).toBe(false);
    expect(isValidPromotion('candidate', 'executable')).toBe(false);
    expect(isValidPromotion('evaluated', 'executable')).toBe(false);
  });

  it('refuses moving backwards', () => {
    expect(isValidPromotion('accepted', 'evaluated')).toBe(false);
    expect(isValidPromotion('executable', 'accepted')).toBe(false);
  });

  it('allows retirement from any live stage', () => {
    for (const stage of PROMOTION_SEQUENCE) {
      expect(isValidPromotion(stage, 'retired')).toBe(true);
    }
  });

  it('treats retired as terminal', () => {
    expect(isValidPromotion('retired', 'evaluated')).toBe(false);
    expect(isValidPromotion('retired', 'retired')).toBe(false);
  });

  it('refuses the Board a skipped promotion even though the Board owns the target stage', () => {
    const decision = evaluateAuthority(
      req({
        actor: board,
        action: 'promote',
        targetStatus: 'executable',
        artefact: { id: 'KI-7', kind: 'KI-record', status: 'evaluated' },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R04');
  });

  it('refuses a promotion request that names no target stage', () => {
    const decision = evaluateAuthority(req({ actor: board, action: 'promote' }));
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R04');
  });
});

// ─── Stage authority (ADR-0097 §1–§2) ───────────────────────────────────────

describe('stage authority', () => {
  it('lets the custodian promote candidate to evaluated', () => {
    const decision = evaluateAuthority(
      req({
        actor: custodian,
        action: 'promote',
        targetStatus: 'evaluated',
        artefact: { id: 'KI-1', kind: 'KI-record', status: 'candidate' },
      }),
    );
    expect(decision.permitted).toBe(true);
    expect(decision.rule).toBe('AP-R05');
  });

  it('refuses the custodian the accepted stage, which is the Board alone', () => {
    const decision = evaluateAuthority(
      req({
        actor: custodian,
        action: 'promote',
        targetStatus: 'accepted',
        artefact: { id: 'KI-2', kind: 'KI-record', status: 'evaluated' },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R05');
    expect(decision.citation).toMatch(/ADR-0097/);
  });

  it('refuses the custodian the executable stage', () => {
    const decision = evaluateAuthority(
      req({
        actor: custodian,
        action: 'promote',
        targetStatus: 'executable',
        artefact: { id: 'KI-3', kind: 'KI-record', status: 'accepted' },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R05');
  });

  it('lets the Board accept and then make executable', () => {
    expect(
      isPermitted(
        req({
          actor: board,
          action: 'accept',
          artefact: { id: 'KI-4', kind: 'KI-record', status: 'evaluated' },
        }),
      ),
    ).toBe(true);
    expect(
      isPermitted(
        req({
          actor: board,
          action: 'promote',
          targetStatus: 'executable',
          artefact: { id: 'KI-4', kind: 'KI-record', status: 'accepted' },
        }),
      ),
    ).toBe(true);
  });

  it('refuses a person holding no governance office the evaluated stage', () => {
    const decision = evaluateAuthority(
      req({
        actor: person,
        action: 'promote',
        targetStatus: 'evaluated',
        artefact: { id: 'KI-5', kind: 'KI-record', status: 'candidate' },
      }),
    );
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('AP-R05');
  });

  it('reserves accepted and executable to the Board in the authority table', () => {
    expect(PROMOTION_AUTHORITY.accepted).toEqual(['board']);
    expect(PROMOTION_AUTHORITY.executable).toEqual(['board']);
  });
});

// ─── Enforcement surface ────────────────────────────────────────────────────

describe('enforcement', () => {
  it('throws AuthorityViolationError carrying the rule and citation', () => {
    const request = req({
      actor: agent,
      action: 'promote',
      targetStatus: 'accepted',
      artefact: { id: 'KO-9', kind: 'KO-record', status: 'evaluated', authoredBy: agent.id },
    });
    expect(() => requireAuthority(request)).toThrow(AuthorityViolationError);
    try {
      requireAuthority(request);
    } catch (error) {
      const violation = error as AuthorityViolationError;
      expect(violation.code).toBe('AUTHORITY_VIOLATION');
      expect(violation.decision.rule).toBe('AP-R03');
      expect(violation.context).toMatchObject({ actorKind: 'agent', action: 'promote' });
    }
  });

  it('does not throw for a permitted request', () => {
    expect(() => requireAuthority(req({ actor: agent, action: 'recommend' }))).not.toThrow();
  });

  it('formats a refusal as a quotable review comment naming rule and source', () => {
    const decision = evaluateAuthority(
      req({
        actor: agent,
        action: 'enforce',
        artefact: { id: 'RULE-1', kind: 'native-rule', authoredBy: agent.id },
      }),
    );
    const comment = formatAuthorityDecision(decision);
    expect(comment).toMatch(/^\[AP-R03\] refused: /);
    expect(comment).toMatch(/Source: .*ADR-0115/);
  });
});
