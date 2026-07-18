import {
  KnowledgeOpportunityProvider,
  RecurrenceTracker,
  normaliseIntent,
  KNOWLEDGE_DIMENSION,
  KNOWLEDGE_OPPORTUNITY_PROVIDER_ID,
} from '../application/knowledge-opportunity-detector';

const ctx = { tenantId: 't1', dimension: KNOWLEDGE_DIMENSION } as const;
const target = {} as const;
const clock = () => new Date('2026-07-18T00:00:00.000Z');

describe('normaliseIntent', () => {
  it('collapses casing, punctuation and whitespace so one question counts once', () => {
    expect(normaliseIntent('How do Aggregates commit?')).toBe('how do aggregates commit');
    expect(normaliseIntent('  HOW   do aggregates  COMMIT ')).toBe('how do aggregates commit');
  });

  it('does not merge genuinely different questions', () => {
    expect(normaliseIntent('how do aggregates commit')).not.toBe(normaliseIntent('how do aggregates publish'));
  });
});

describe('RecurrenceTracker', () => {
  it('ignores answered intents — a question the corpus answered is not a gap', () => {
    const t = new RecurrenceTracker();
    t.record({ intent: 'anything', citationCount: 3 });
    t.record({ intent: 'anything', citationCount: 5 });
    expect(t.size).toBe(0);
    expect(t.recurring(1)).toHaveLength(0);
  });

  it('counts only unanswered intents, and only past the threshold', () => {
    const t = new RecurrenceTracker();
    t.record({ intent: 'aggregate boundaries', citationCount: 0 });
    expect(t.recurring(2)).toHaveLength(0);
    t.record({ intent: 'Aggregate Boundaries!', citationCount: 0 });
    expect(t.recurring(2)).toHaveLength(1);
    expect(t.recurring(2)[0].occurrences).toBe(2);
  });

  it('tracks the repositories a question came from', () => {
    const t = new RecurrenceTracker();
    t.record({ intent: 'outbox', citationCount: 0, repository: 'ums' });
    t.record({ intent: 'outbox', citationCount: 0, repository: 'tms' });
    t.record({ intent: 'outbox', citationCount: 0, repository: 'ums' });
    expect(t.recurring(2)[0].repositories).toEqual(['tms', 'ums']);
  });

  it('ignores blank intents rather than counting an empty question', () => {
    const t = new RecurrenceTracker();
    t.record({ intent: '   ', citationCount: 0 });
    t.record({ intent: '!!!', citationCount: 0 });
    expect(t.size).toBe(0);
  });

  it('orders by occurrences so the loudest gap surfaces first', () => {
    const t = new RecurrenceTracker();
    ['a', 'a', 'b', 'b', 'b'].forEach((i) => t.record({ intent: i, citationCount: 0 }));
    const r = t.recurring(2);
    expect(r.map((e) => e.intent)).toEqual(['b', 'a']);
  });
});

describe('KnowledgeOpportunityProvider', () => {
  it('serves the knowledge dimension and declines others', () => {
    const p = new KnowledgeOpportunityProvider();
    expect(p.supports({ tenantId: 't', dimension: KNOWLEDGE_DIMENSION })).toBe(true);
    expect(p.supports({ tenantId: 't' })).toBe(true);
    expect(p.supports({ tenantId: 't', dimension: 'a11y' })).toBe(false);
  });

  it('emits no findings when nothing recurs — silence is the default', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock });
    p.observe({ intent: 'asked once', citationCount: 0 });
    const ev = await p.collect(target, ctx);
    expect(ev.findings).toHaveLength(0);
    expect(ev.metrics.unansweredIntents).toBe(1);
    expect(ev.metrics.recurringIntents).toBe(0);
  });

  it('proposes a candidate once an unanswered question recurs', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock });
    p.observe({ intent: 'how do aggregates commit', citationCount: 0, repository: 'ums' });
    p.observe({ intent: 'How do aggregates commit?', citationCount: 0, repository: 'ums' });
    const ev = await p.collect(target, ctx);
    expect(ev.findings).toHaveLength(1);
    expect(ev.findings[0].code).toBe('KO-CANDIDATE-RECURRENCE');
    expect(ev.findings[0].message).toContain('2 time(s)');
  });

  it('never emits an error severity — a knowledge gap is not a breakage', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock });
    for (const repo of ['a', 'b', 'c', 'd']) {
      p.observe({ intent: 'widely asked', citationCount: 0, repository: repo });
    }
    const ev = await p.collect(target, ctx);
    expect(['info', 'low', 'medium']).toContain(ev.findings[0].severity);
  });

  it('escalates severity with breadth across repositories, not volume alone', async () => {
    const narrow = new KnowledgeOpportunityProvider({ now: clock });
    narrow.observe({ intent: 'q', citationCount: 0, repository: 'one' });
    narrow.observe({ intent: 'q', citationCount: 0, repository: 'one' });
    const wide = new KnowledgeOpportunityProvider({ now: clock });
    ['one', 'two', 'three'].forEach((r) => wide.observe({ intent: 'q', citationCount: 0, repository: r }));

    const [n, w] = [await narrow.collect(target, ctx), await wide.collect(target, ctx)];
    expect(n.findings[0].severity).toBe('info');
    expect(w.findings[0].severity).toBe('medium');
  });

  it('emits well-formed Evidence with mandatory provenance', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock, adapterVersion: '9.9.9' });
    p.observe({ intent: 'x', citationCount: 0 });
    p.observe({ intent: 'x', citationCount: 0 });
    const ev = await p.collect(target, ctx);
    expect(ev.source).toBe(KNOWLEDGE_OPPORTUNITY_PROVIDER_ID);
    expect(ev.dimension).toBe(KNOWLEDGE_DIMENSION);
    expect(ev.determinism).toBe('probabilistic');
    expect(ev.provenance.collectedBy).toBe(KNOWLEDGE_OPPORTUNITY_PROVIDER_ID);
    expect(ev.provenance.adapterVersion).toBe('9.9.9');
    expect(ev.provenance.timestamp).toBe('2026-07-18T00:00:00.000Z');
  });

  it('describes findings as candidates a human decides on, never as records', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock });
    p.observe({ intent: 'y', citationCount: 0 });
    p.observe({ intent: 'y', citationCount: 0 });
    const ev = await p.collect(target, ctx);
    expect(ev.findings[0].message).toMatch(/Candidate for a KO-\* record/);
    expect(ev.findings[0].message).toMatch(/a human decides/);
  });

  it('carries no file content, so it cannot leak what ADR-0115 excludes', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock });
    p.observe({ intent: 'secret question', citationCount: 0, repository: 'r' });
    p.observe({ intent: 'secret question', citationCount: 0, repository: 'r' });
    const ev = await p.collect(target, ctx);
    const serialised = JSON.stringify(ev);
    expect(serialised).not.toMatch(/content|fileText|body/i);
  });

  it('honours a custom recurrence threshold', async () => {
    const p = new KnowledgeOpportunityProvider({ now: clock, recurrenceThreshold: 3 });
    p.observe({ intent: 'z', citationCount: 0 });
    p.observe({ intent: 'z', citationCount: 0 });
    expect((await p.collect(target, ctx)).findings).toHaveLength(0);
    p.observe({ intent: 'z', citationCount: 0 });
    expect((await p.collect(target, ctx)).findings).toHaveLength(1);
  });
});

/**
 * The wiring contract for the `ground` step (ADR-0115). These pin the guard
 * rather than the plumbing: the detector is only meaningful once a corpus
 * exists, and getting that wrong turns it into a noise generator.
 */
describe('grounding wiring contract', () => {
  const observationsFrom = (totalChunks: number, citationCount: number) => {
    const provider = new KnowledgeOpportunityProvider({ now: clock });
    // Mirrors the guard in agent-runtime.service.ts: observe only when the
    // corpus could have answered.
    if (totalChunks > 0) {
      provider.observe({ intent: 'how do aggregates commit', citationCount });
      provider.observe({ intent: 'how do aggregates commit', citationCount });
    }
    return provider;
  };

  it('observes nothing when the corpus is empty — zero citations there means "no corpus", not "no answer"', async () => {
    const ev = await observationsFrom(0, 0).collect(target, ctx);
    expect(ev.metrics.unansweredIntents).toBe(0);
    expect(ev.findings).toHaveLength(0);
  });

  it('detects the gap once a populated corpus fails to answer', async () => {
    const ev = await observationsFrom(500, 0).collect(target, ctx);
    expect(ev.findings).toHaveLength(1);
  });

  it('stays silent when a populated corpus answers', async () => {
    const ev = await observationsFrom(500, 4).collect(target, ctx);
    expect(ev.findings).toHaveLength(0);
    expect(ev.metrics.unansweredIntents).toBe(0);
  });
});
