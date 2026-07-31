/**
 * GT-604 — the shared deposit client, tested on the four properties that make it
 * worth sharing at all. Everything here runs against an injected fetch: what is
 * under test is WHAT GOES ON THE WIRE, not whether Node can make a request.
 */

import {
  TrackerEvaluationIngestClient,
  EvaluationIngestError,
  createEvaluationIngestClientFromEnv,
  depositEvaluation,
  EVOLITH_TRACKER_URL_ENV,
  EVOLITH_TRACKER_API_KEY_ENV,
  type IngestFetchLike,
} from './evaluation-ingest.client';
import { checkEvaluationIngestPayload } from '@beyondnet/evolith-contracts/ingest';
import type { EvaluationIngestInput } from '@beyondnet/evolith-contracts/ingest';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'http://tracker-api:8080/api/v1';
const API_KEY = 'core-machine-key-for-tests';

/**
 * A verdict shaped like what `evaluateDriftGate` produces, carrying the two things
 * the gap names: a rule executed by an engine the Tracker has never heard of, and
 * a requester that is NOT the accountable owner.
 */
function verdict(): EvaluationIngestInput {
  return {
    surface: 'cli',
    producerVersion: 'evolith-cli@1.2.0',
    result: {
      overallVerdict: 'FAIL',
      outcome: 'rejected',
      evaluatedAt: '2026-07-30T10:00:00.000Z',
      correlationId: 'cli-eval-2026-07-30T10:00:00.000Z',
      rulesExecuted: [
        { ruleId: 'layer-boundary', rulesetRef: 'hexagonal@1', engine: 'native', verdict: 'FAIL' },
        { ruleId: 'adr-compliance', engine: 'opa', verdict: 'PASS' },
        { ruleId: 'brand-new-rule', engine: 'an-engine-nobody-has-heard-of', verdict: 'WARN' },
      ],
      requester: { actorType: 'agent', actorId: 'who-asked', modelRef: 'claude-opus-5' },
      versions: { core: '1.2.0' },
    },
    violations: [
      {
        ruleId: 'layer-boundary',
        tool: 'dependency-cruiser',
        file: 'src/app/handler.ts',
        severity: 'error',
        message: 'application imports infrastructure',
        owner: '@team/who-fixes',
        fingerprint: 'fp-001',
        frozen: false,
      },
    ],
  };
}

/** Records what was sent and answers 200 with the Tracker's ack shape. */
function recordingFetch(status = 200, body: unknown = { transactionId: 't-1', correlationId: 'c-1', created: true }) {
  const calls: { url: string; init: Record<string, unknown> }[] = [];
  const impl: IngestFetchLike = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { calls, impl };
}

const sentBody = (calls: { init: Record<string, unknown> }[]): Record<string, unknown> =>
  JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;

// ---------------------------------------------------------------------------

describe('TrackerEvaluationIngestClient', () => {
  it('posts to the route the published contract declares, not to a hand-typed path', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE_URL}/core-evaluation-transactions`);
    expect(calls[0].init.method).toBe('POST');
  });

  it('presents the CoreMachine key in x-api-key', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    expect((calls[0].init.headers as Record<string, string>)['x-api-key']).toBe(API_KEY);
  });

  /**
   * The one field whose PRESENCE is the defect. The Tracker derives the tenant from
   * which key matched; a body-supplied tenant would let any valid key deposit into
   * any tenant's ledger.
   */
  it('never puts a tenant in the body', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    expect(sentBody(calls)).not.toHaveProperty('tenantId');
  });

  /**
   * The engine vocabulary is OPEN. A client that quietly rewrote an unrecognised
   * engine to `native` would deposit a row claiming a governance rule produced a
   * finding that a policy engine produced — a substitution no later consumer could
   * detect.
   */
  it('carries the engine each rule actually ran on, verbatim', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    const rules = sentBody(calls).rulesExecuted as { engine: string }[];
    expect(rules.map((r) => r.engine)).toEqual(['native', 'opa', 'an-engine-nobody-has-heard-of']);
  });

  it('keeps the requester and the accountable owner apart on the wire', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    const body = sentBody(calls);
    expect((body.requestedBy as { actorId: string }).actorId).toBe('who-asked');
    const violations = body.violations as Record<string, unknown>[];
    expect(violations[0].accountableOwner).toBe('@team/who-fixes');
    expect(violations[0]).not.toHaveProperty('owner');
    expect(body.accountableOwners).toEqual(['@team/who-fixes']);
  });

  /**
   * The oracle the Tracker's own conformance test runs. Asserting against it here
   * means the client and the endpoint are checked by the SAME rule rather than by
   * two hand-written lists that can drift apart.
   */
  it('sends a body that satisfies the contract oracle', async () => {
    const { calls, impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await client.deposit(verdict());

    expect(checkEvaluationIngestPayload(sentBody(calls))).toEqual({ ok: true, problems: [] });
  });

  it('reports created=false on an idempotent replay so the producer can log which it got', async () => {
    const { impl } = recordingFetch(200, { transactionId: 't-1', correlationId: 'c-1', created: false });
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await expect(client.deposit(verdict())).resolves.toMatchObject({ created: false, transactionId: 't-1' });
  });

  it('throws on a refusal instead of pretending the deposit landed', async () => {
    const { impl } = recordingFetch(401, { error: 'no' });
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    await expect(client.deposit(verdict())).rejects.toBeInstanceOf(EvaluationIngestError);
  });
});

describe('createEvaluationIngestClientFromEnv', () => {
  it('returns undefined when the surface is not configured to deposit', () => {
    expect(createEvaluationIngestClientFromEnv({})).toBeUndefined();
  });

  /**
   * A no-op client that answered "deposited" would make an unconfigured deployment
   * indistinguishable from a working one — which is the state this gap started from.
   */
  it('returns a real client when configured', () => {
    const client = createEvaluationIngestClientFromEnv({
      [EVOLITH_TRACKER_URL_ENV]: BASE_URL,
      [EVOLITH_TRACKER_API_KEY_ENV]: API_KEY,
    });
    expect(client?.url).toBe(`${BASE_URL}/core-evaluation-transactions`);
  });

  it('refuses a URL without a key rather than 401-ing on every evaluation', () => {
    expect(() => createEvaluationIngestClientFromEnv({ [EVOLITH_TRACKER_URL_ENV]: BASE_URL })).toThrow(
      /machine-authenticated/,
    );
  });
});

describe('depositEvaluation', () => {
  it('does nothing, and says nothing, when no client is configured', async () => {
    const warn = jest.fn();
    await expect(depositEvaluation({ ...verdict(), client: undefined, warn })).resolves.toEqual({
      deposited: false,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  /**
   * The load-bearing one. A ledger outage must NOT change a verdict: if depositing
   * could throw out of here, `evolith evaluate` would fail on an unrelated service
   * being down, and a gate that breaks open on an outage is worse than no gate.
   */
  it('never throws when the Tracker is down — the verdict stands, the row is missing', async () => {
    const client = new TrackerEvaluationIngestClient({
      baseUrl: BASE_URL,
      apiKey: API_KEY,
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const warn = jest.fn();

    const outcome = await depositEvaluation({ ...verdict(), client, warn });

    expect(outcome.deposited).toBe(false);
    expect(outcome.error).toContain('ECONNREFUSED');
    // Reported, never swallowed: a deposit path that fails quietly is
    // indistinguishable from one that was never wired.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('NOT deposited');
  });

  it('reports the ack when the deposit lands', async () => {
    const { impl } = recordingFetch();
    const client = new TrackerEvaluationIngestClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetchImpl: impl });

    const outcome = await depositEvaluation({ ...verdict(), client });

    expect(outcome).toMatchObject({ deposited: true, ack: { created: true } });
  });
});
