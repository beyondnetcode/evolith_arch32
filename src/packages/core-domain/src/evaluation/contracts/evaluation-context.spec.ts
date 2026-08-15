/**
 * GT-688 — the topology ARITY helpers.
 *
 * These five lines used to be copy-pasted into two evaluators
 * (`kind-evaluators.ts` design kind and phase-artifacts kind) and absent from a
 * third (the topology kind, which read only the scalar and therefore SKIPped on
 * every composition). Extracting them into ONE function is the point; this file
 * is what stops the rule from being re-forked.
 */

import {
  PROGRESSIVE_AXIS_TOPOLOGIES,
  confirmedTopologies,
  progressiveAxisMembers,
  topologyRefIsShadowed,
} from './evaluation-context';
import type { EvaluationContext } from './evaluation-context';
import { PROGRESSIVE_PHASE_TOPOLOGY } from '../../application/validators/rule-applicability';

const ctx = (over: Partial<EvaluationContext>): EvaluationContext =>
  ({ kinds: ['topology'], workspaceRef: 'ws://x', ...over }) as EvaluationContext;

describe('confirmedTopologies (GT-688)', () => {
  it('a non-empty composition IS the answer', () => {
    expect(
      confirmedTopologies(ctx({ design: { topologyConfirmedRefs: ['modular-monolith', 'agentic-ai'] } })),
    ).toEqual(['modular-monolith', 'agentic-ai']);
  });

  it('reads topologyRef as a SINGLE-ELEMENT SHORTHAND when no composition is declared', () => {
    expect(confirmedTopologies(ctx({ topologyRef: 'serverless' }))).toEqual(['serverless']);
  });

  it('the plural wins on disagreement', () => {
    expect(
      confirmedTopologies(
        ctx({ topologyRef: 'serverless', design: { topologyConfirmedRefs: ['event-driven'] } }),
      ),
    ).toEqual(['event-driven']);
  });

  it('an EMPTY composition falls back to the scalar rather than swallowing it', () => {
    expect(confirmedTopologies(ctx({ topologyRef: 'serverless', design: { topologyConfirmedRefs: [] } }))).toEqual([
      'serverless',
    ]);
  });

  it('de-duplicates a repeated member', () => {
    expect(
      confirmedTopologies(ctx({ design: { topologyConfirmedRefs: ['event-driven', 'event-driven'] } })),
    ).toEqual(['event-driven']);
  });

  it('is the empty composition when nothing is declared', () => {
    expect(confirmedTopologies(ctx({}))).toEqual([]);
  });
});

describe('topologyRefIsShadowed (GT-688)', () => {
  it('is true only when the scalar is absent from a non-empty composition', () => {
    expect(
      topologyRefIsShadowed(ctx({ topologyRef: 'serverless', design: { topologyConfirmedRefs: ['event-driven'] } })),
    ).toBe(true);
  });

  it('is false when the scalar is a MEMBER of the composition', () => {
    expect(
      topologyRefIsShadowed(
        ctx({ topologyRef: 'event-driven', design: { topologyConfirmedRefs: ['event-driven', 'agentic-ai'] } }),
      ),
    ).toBe(false);
  });

  it('is false for a scalar-only context — nothing overrode it', () => {
    expect(topologyRefIsShadowed(ctx({ topologyRef: 'serverless' }))).toBe(false);
  });
});

describe('the progressive axis (GT-688)', () => {
  it('PROGRESSIVE_AXIS_TOPOLOGIES equals the values of PROGRESSIVE_PHASE_TOPOLOGY', () => {
    // The duplication is DELIBERATE — `evaluation/contracts/` may not import
    // `application/validators/` in production code — so this assertion is the
    // only thing standing between it and a silent drift.
    expect([...PROGRESSIVE_AXIS_TOPOLOGIES].sort()).toEqual(Object.values(PROGRESSIVE_PHASE_TOPOLOGY).sort());
  });

  it('names the progressive members of a mixed composition', () => {
    expect(progressiveAxisMembers(['modular-monolith', 'agentic-ai', 'microservices'])).toEqual([
      'modular-monolith',
      'microservices',
    ]);
  });

  it('a legal composition has at most one progressive member', () => {
    expect(progressiveAxisMembers(['modular-monolith', 'agentic-ai', 'event-driven'])).toEqual([
      'modular-monolith',
    ]);
    expect(progressiveAxisMembers(['agentic-ai', 'event-driven'])).toEqual([]);
  });
});
