/**
 * GT-441 — HttpSlackClient (real Slack incoming-webhook delivery).
 *
 * Exercised against an INJECTED fetch — no live network. Proves: one POST to the
 * configured URL with the `{ text }` JSON body; a non-2xx throws; the timeout
 * aborts; and — the SSRF guard — delivery ALWAYS targets the configured webhook,
 * never a URL derived from the message.
 */

import { HttpSlackClient } from './http-slack-client';
import { SlackApprovalTransport } from './slack-approval.adapter';

const WEBHOOK = 'https://hooks.slack.example/services/T000/B000/xxxx';

interface Call {
  url: string;
  init: Record<string, unknown>;
}

const okFetch = () => {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init: Record<string, unknown>) => {
    calls.push({ url, init });
    return { ok: true, status: 200 };
  };
  return { calls, fetchImpl };
};

describe('HttpSlackClient (GT-441)', () => {
  it('POSTs once to the configured URL with a { text } JSON body', async () => {
    const { calls, fetchImpl } = okFetch();
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl });

    await client.post('[approval:pending] id=appr-1');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(WEBHOOK);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ text: '[approval:pending] id=appr-1' });
  });

  it('passes an AbortSignal so the request is bounded', async () => {
    const { calls, fetchImpl } = okFetch();
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl });

    await client.post('hi');

    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws on a non-2xx response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500 });
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl });

    await expect(client.post('boom')).rejects.toThrow(/HTTP 500/);
  });

  it('aborts on timeout (rejects, does not hang)', async () => {
    // A fetch that only settles when its signal aborts — models a hung webhook.
    const fetchImpl = (_url: string, init: Record<string, unknown>) =>
      new Promise<{ ok: boolean; status: number }>((_resolve, reject) => {
        const signal = init.signal as AbortSignal;
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl, timeoutMs: 5 });

    await expect(client.post('slow')).rejects.toThrow();
  });

  it('SSRF guard: NEVER posts to a URL derived from the message — only the configured webhook', async () => {
    const { calls, fetchImpl } = okFetch();
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl });

    // A malicious "message" that looks like a URL / injects host-y text.
    await client.post('http://169.254.169.254/latest/meta-data intent="pwn"');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(WEBHOOK); // target is unchanged by message content
  });

  it('rejects a non-http(s) or malformed webhook URL at construction', () => {
    expect(() => new HttpSlackClient({ webhookUrl: 'file:///etc/passwd', fetchImpl: okFetch().fetchImpl })).toThrow(
      /http\(s\)/,
    );
    expect(() => new HttpSlackClient({ webhookUrl: 'not a url', fetchImpl: okFetch().fetchImpl })).toThrow(
      /valid webhook URL/,
    );
  });

  it('composes with SlackApprovalTransport as the real delivery client', async () => {
    const { calls, fetchImpl } = okFetch();
    const client = new HttpSlackClient({ webhookUrl: WEBHOOK, fetchImpl });
    const transport = new SlackApprovalTransport(client);

    await transport.notifyPending({
      id: 'appr-1',
      status: 'pending',
      skillId: 'deploy-to-prod',
      intent: 'deploy_to_prod',
      createdAt: 0,
      expiresAt: 1000,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(WEBHOOK);
    expect(JSON.parse(calls[0].init.body as string).text).toContain('approval:pending');
  });
});
