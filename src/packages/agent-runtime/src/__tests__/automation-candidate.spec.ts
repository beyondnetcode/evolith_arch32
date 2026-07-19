import {
  assessAutomationCandidate,
  formatAssessment,
  DEFAULT_BREADTH_THRESHOLD,
  type AutomationInput,
} from '../application/automation-candidate';

const ready: AutomationInput = {
  knowledgeId: 'KO-DOMAIN-AGGREGATE-TX-001',
  status: 'accepted',
  repositories: ['ums', 'tms', 'dt'],
  occurrences: 7,
  antiPatterns: ['multi-aggregate-transaction'],
  mechanicallyDetectable: true,
};

describe('assessAutomationCandidate', () => {
  it('proposes a rule when every precondition holds', () => {
    const a = assessAutomationCandidate(ready);
    expect(a.verdict).toBe('propose-rule');
    expect(a.ready).toBe(true);
    expect(a.breadth).toBe(3);
  });

  it('defers to the Board rather than implying the rule is decided', () => {
    const a = assessAutomationCandidate(ready);
    expect(a.reasons.join(' ')).toContain('Architecture Board decides');
    expect(a.reasons.join(' ')).toContain('KI-R03');
  });

  // The check that outranks all others.
  it('refuses knowledge that needs judgement, however widespread', () => {
    const a = assessAutomationCandidate({
      ...ready,
      mechanicallyDetectable: false,
      repositories: ['a', 'b', 'c', 'd', 'e', 'f'],
      occurrences: 99,
    });
    expect(a.verdict).toBe('not-automatable');
    expect(a.ready).toBe(false);
    expect(a.reasons[0]).toContain('false positives');
  });

  it('refuses to automate knowledge the Board has not accepted', () => {
    for (const status of ['candidate', 'evaluated'] as const) {
      const a = assessAutomationCandidate({ ...ready, status });
      expect(a.verdict).toBe('premature');
      expect(a.reasons[0]).toContain('has not ratified');
    }
  });

  it('refuses retired knowledge as premature rather than proposing it', () => {
    expect(assessAutomationCandidate({ ...ready, status: 'retired' }).verdict).toBe('premature');
  });

  it('refuses when there is no anti-pattern for a validator to match', () => {
    const a = assessAutomationCandidate({ ...ready, antiPatterns: [] });
    expect(a.verdict).toBe('not-automatable');
    expect(a.reasons[0]).toContain('nothing concrete');
  });

  it('keeps observing when the pattern is not yet broad enough', () => {
    const a = assessAutomationCandidate({ ...ready, repositories: ['ums', 'tms'] });
    expect(a.verdict).toBe('keep-observing');
    expect(a.reasons[0]).toContain('local habit');
  });

  it('counts breadth by distinct repository, not by occurrence', () => {
    const a = assessAutomationCandidate({ ...ready, repositories: ['ums', 'ums', 'ums'], occurrences: 50 });
    expect(a.breadth).toBe(1);
    expect(a.verdict).toBe('keep-observing');
  });

  it('lets breadth be tuned without touching the logic', () => {
    const a = assessAutomationCandidate({ ...ready, repositories: ['ums', 'tms'] }, { breadthThreshold: 2 });
    expect(a.verdict).toBe('propose-rule');
  });

  it('applies the default threshold of three', () => {
    expect(DEFAULT_BREADTH_THRESHOLD).toBe(3);
    const a = assessAutomationCandidate({ ...ready, repositories: ['a', 'b'] });
    expect(a.verdict).toBe('keep-observing');
  });

  it('orders judgement above status, so the deeper reason is the one reported', () => {
    const a = assessAutomationCandidate({ ...ready, status: 'candidate', mechanicallyDetectable: false });
    expect(a.verdict).toBe('not-automatable');
  });

  it('never reports ready for any verdict other than propose-rule', () => {
    const cases: AutomationInput[] = [
      { ...ready, mechanicallyDetectable: false },
      { ...ready, status: 'candidate' },
      { ...ready, antiPatterns: [] },
      { ...ready, repositories: ['one'] },
    ];
    for (const c of cases) expect(assessAutomationCandidate(c).ready).toBe(false);
  });
});

describe('formatAssessment', () => {
  it('renders a headline and bulleted reasons', () => {
    const text = formatAssessment('KO-1', assessAutomationCandidate(ready));
    expect(text).toContain('KO-1: ready for a rule proposal');
    expect(text).toContain('\n- ');
  });

  it('renders a distinct headline per verdict', () => {
    const seen = new Set(
      [
        assessAutomationCandidate({ ...ready, mechanicallyDetectable: false }),
        assessAutomationCandidate({ ...ready, status: 'candidate' }),
        assessAutomationCandidate({ ...ready, repositories: ['one'] }),
        assessAutomationCandidate(ready),
      ].map((a) => formatAssessment('X', a).split('\n')[0]),
    );
    expect(seen.size).toBe(4);
  });
});
