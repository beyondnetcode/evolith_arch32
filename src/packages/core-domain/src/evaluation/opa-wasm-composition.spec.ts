/**
 * GT-688 — the compiled bundle must DISCRIMINATE on the confirmed composition.
 *
 * `opa test` cannot prove this. It evaluates a package directly, so a policy that
 * is not aggregated into `main.rego` passes every one of its own unit tests and
 * then decides nothing at runtime — `compile-opa-wasm.mjs` builds exactly two
 * entrypoints, and anything unreachable from one of them is pruned out of the
 * bundle entirely. That is the R-25 defect GT-602 was registered for, and five
 * non-test policies are in that state today.
 *
 * So this suite loads the SHIPPED `policy.wasm` and evaluates through the real
 * `evolith/main/violations` entrypoint, on input shaped the way
 * `OpaInputBuilder` shapes it. The two cases differ in exactly ONE thing: whether
 * `input.context.topologyConfirmedRefs` names `event-driven`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadPolicy } from '@open-policy-agent/opa-wasm';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const WASM = path.join(REPO_ROOT, 'src/rulesets/opa/policy.wasm');

/** Identical in both cases: the repository declares NO transactional outbox. */
const SATELLITE = { eventDriven: { hasOutbox: false } };

type Violation = { id?: string };

describe('GT-688 · the compiled bundle discriminates on the composition', () => {
  let evaluate: (input: unknown) => Violation[];

  beforeAll(async () => {
    // A missing bundle must be a RED test, not a skipped one: "the wasm was not
    // built" is exactly the condition under which this gap silently reopens.
    expect(fs.existsSync(WASM)).toBe(true);
    const policy = await loadPolicy(fs.readFileSync(WASM));
    evaluate = (input: unknown): Violation[] => {
      const resultSet = policy.evaluate(input, 'evolith/main/violations') as
        | { result?: unknown }[]
        | undefined;
      const raw = resultSet?.[0]?.result;
      return Array.isArray(raw) ? (raw as Violation[]) : [];
    };
  }, 60_000);

  const idsFor = (context?: Record<string, unknown>): string[] =>
    evaluate({ ...(context ? { context } : {}), satellite: SATELLITE })
      .map((v) => v.id)
      .filter((id): id is string => typeof id === 'string');

  it('TPC-01 fires when the composition confirms event-driven', () => {
    const ids = idsFor({ topologyConfirmedRefs: ['modular-monolith', 'event-driven'] });
    expect(ids).toContain('TPC-01');
  });

  it('TPC-01 is silent on the SAME satellite when the composition does not', () => {
    const ids = idsFor({ topologyConfirmedRefs: ['modular-monolith', 'agentic-ai'] });
    expect(ids).not.toContain('TPC-01');
  });

  it('TPC-01 is silent for a pre-GT-688 caller that declares no composition', () => {
    expect(idsFor(undefined)).not.toContain('TPC-01');
  });

  it('TPC-01 is silent when the confirmed event-driven repo DOES declare an outbox', async () => {
    const policy = await loadPolicy(fs.readFileSync(WASM));
    const resultSet = policy.evaluate(
      {
        context: { topologyConfirmedRefs: ['event-driven'] },
        satellite: { eventDriven: { hasOutbox: true } },
      },
      'evolith/main/violations',
    ) as { result?: unknown }[] | undefined;
    const ids = (Array.isArray(resultSet?.[0]?.result) ? (resultSet![0].result as Violation[]) : [])
      .map((v) => v.id);
    expect(ids).not.toContain('TPC-01');
  }, 60_000);
});
