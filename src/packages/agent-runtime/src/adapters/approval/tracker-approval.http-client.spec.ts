import { TrackerApprovalHttpClient } from './tracker-approval.http-client';
import { TrackerApprovalAdapter } from './tracker-approval.adapter';
import type { TrackerApprovalSubmission } from './tracker-approval.adapter';

function response(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

const submission: TrackerApprovalSubmission = {
  tenantId: '11111111-1111-1111-1111-111111111111',
  skillId: 'deploy-to-prod',
  intent: 'ship release 1.2.3',
  productId: 'prod-1',
  initiativeId: 'init-1',
  correlationId: 'corr-1',
  requestedBy: 'agent-x',
  executionMode: 'agentic',
};

describe('TrackerApprovalHttpClient', () => {
  it('POSTs to {baseUrl}/runtime-approvals with the machine key and returns the mapped decision', async () => {
    const calls: Array<{ url: string; init: Record<string, unknown> }> = [];
    const fetchImpl = async (url: string, init: Record<string, unknown>) => {
      calls.push({ url, init });
      return response(200, {
        status: 'pending',
        approvalId: 'appr-1',
        reason: 'awaiting a human',
      });
    };

    const client = new TrackerApprovalHttpClient({
      baseUrl: 'http://tracker-api:8080/api/v1/',
      apiKey: 'machine-key-abc',
      fetchImpl,
    });

    const result = await client.submit(submission);

    expect(calls).toHaveLength(1);
    // Trailing slash on baseUrl is normalised to exactly one join.
    expect(calls[0].url).toBe('http://tracker-api:8080/api/v1/runtime-approvals');
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>)['x-api-key']).toBe('machine-key-abc');

    const sent = JSON.parse(calls[0].init.body as string);
    // The tenant is derived Tracker-side from the key — it must NOT be on the wire.
    expect(sent).not.toHaveProperty('tenantId');
    expect(sent).toMatchObject({
      skillId: 'deploy-to-prod',
      intent: 'ship release 1.2.3',
      productId: 'prod-1',
      initiativeId: 'init-1',
      correlationId: 'corr-1',
      requestedBy: 'agent-x',
      executionMode: 'agentic',
    });

    expect(result).toEqual({ status: 'pending', approvalId: 'appr-1', reason: 'awaiting a human' });
  });

  it('omits x-api-key when no key is configured', async () => {
    let seen: Record<string, string> = {};
    const client = new TrackerApprovalHttpClient({
      baseUrl: 'http://tracker-api:8080/api/v1',
      fetchImpl: async (_url, init) => {
        seen = init.headers as Record<string, string>;
        return response(200, { status: 'approved', approver: 'alice' });
      },
    });
    await client.submit(submission);
    expect(seen).not.toHaveProperty('x-api-key');
  });

  it('throws on a non-2xx so the adapter denies fail-closed (not a decision)', async () => {
    const client = new TrackerApprovalHttpClient({
      baseUrl: 'http://tracker-api:8080/api/v1',
      apiKey: 'bad-key',
      fetchImpl: async () => response(401, 'Invalid Core machine credential.'),
    });
    await expect(client.submit(submission)).rejects.toThrow(/HTTP 401/);
  });

  it('feeds the real adapter end-to-end: an approved Tracker answer grants', async () => {
    const client = new TrackerApprovalHttpClient({
      baseUrl: 'http://tracker-api:8080/api/v1',
      apiKey: 'k',
      fetchImpl: async () => response(200, { status: 'approved', approver: 'alice', approvalId: 'a-1' }),
    });
    const adapter = new TrackerApprovalAdapter({ client });

    const decision = await adapter.requireApproval({
      skill: { id: 'deploy-to-prod' } as any,
      request: { intent: 'ship it', context: { tenantId: submission.tenantId } } as any,
    } as any);

    expect(decision.granted).toBe(true);
    expect(decision.status).toBe('approved');
    expect(decision.approver).toBe('alice');
    expect(decision.approvalId).toBe('a-1');
  });

  it('feeds the real adapter end-to-end: a 401 becomes a fail-closed unavailable denial', async () => {
    const client = new TrackerApprovalHttpClient({
      baseUrl: 'http://tracker-api:8080/api/v1',
      apiKey: 'bad',
      fetchImpl: async () => response(401, 'nope'),
    });
    const adapter = new TrackerApprovalAdapter({ client });

    const decision = await adapter.requireApproval({
      skill: { id: 'deploy-to-prod' } as any,
      request: { intent: 'ship it', context: { tenantId: submission.tenantId } } as any,
    } as any);

    expect(decision.granted).toBe(false);
    // No lifecycle status when the Core could not obtain an answer.
    expect(decision.status).toBeUndefined();
    expect(decision.reason).toMatch(/tracker-unavailable:/);
  });
});
