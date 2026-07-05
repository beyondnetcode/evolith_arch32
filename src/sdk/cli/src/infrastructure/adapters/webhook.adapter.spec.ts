import { WebhookAdapter } from '@beyondnet/evolith-infra-providers';
import { GateEvidence } from '@beyondnet/evolith-core-domain/domain/gate-evidence';

describe('WebhookAdapter', () => {
  let adapter: WebhookAdapter;
  let globalFetch: jest.Mock;

  beforeEach(() => {
    adapter = new WebhookAdapter();
    globalFetch = jest.fn();
    global.fetch = globalFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const dummyEvidence: GateEvidence = {
    gateId: 'test-gate',
    phase: 'design',
    verdict: 'passed',
    rulesetRef: 'test',
    rulesetVersion: '1.0',
    violations: [],
    evaluatedAt: '2026-01-01',
    evaluatedBy: 'human',
  };

  it('should post evidence successfully', async () => {
    globalFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await adapter.notify('https://example.com/webhook', dummyEvidence);

    expect(globalFetch).toHaveBeenCalledWith('https://example.com/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dummyEvidence),
      // GT-351: each attempt is bounded by an AbortController timeout.
      signal: expect.any(AbortSignal),
    });
  });

  it('should throw error if response is not ok', async () => {
    globalFetch.mockResolvedValue({ ok: false, status: 500 });
    // maxAttempts:1 — assert the single-attempt failure surfaces the status.
    const noRetry = new WebhookAdapter({ maxAttempts: 1 });

    await expect(noRetry.notify('https://example.com/webhook', dummyEvidence))
      .rejects.toThrow('Webhook delivery failed with status: 500');
  });
});
