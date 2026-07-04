import { WebhookAdapter } from './webhook.adapter';
import { GateEvidence } from '@evolith/core-domain/domain/gate-evidence';

const evidence = {} as GateEvidence;
const ok: any = { ok: true, status: 200 };
const resp = (status: number): any => ({ ok: status >= 200 && status < 300, status });
const noSleep = async (): Promise<void> => {};

describe('WebhookAdapter (GT-351 hardening)', () => {
  it('POSTs JSON and resolves on 2xx', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok);
    const adapter = new WebhookAdapter({ fetchImpl: fetchImpl as any, sleepImpl: noSleep });

    await expect(adapter.notify('https://hook.example/x', evidence)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://hook.example/x');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects disallowed URL schemes (SSRF guard) without fetching', async () => {
    const fetchImpl = jest.fn();
    const adapter = new WebhookAdapter({ fetchImpl: fetchImpl as any });

    await expect(adapter.notify('file:///etc/passwd', evidence)).rejects.toThrow(/protocol not allowed/);
    await expect(adapter.notify('not-a-url', evidence)).rejects.toThrow(/Invalid webhook URL/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does NOT retry a 4xx response and throws immediately', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(400));
    const adapter = new WebhookAdapter({ fetchImpl: fetchImpl as any, sleepImpl: noSleep, maxAttempts: 3 });

    await expect(adapter.notify('https://hook.example/x', evidence)).rejects.toThrow(/status: 400/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries transient 5xx up to maxAttempts then throws', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(503));
    const adapter = new WebhookAdapter({ fetchImpl: fetchImpl as any, sleepImpl: noSleep, maxAttempts: 3 });

    await expect(adapter.notify('https://hook.example/x', evidence)).rejects.toThrow(/after 3 attempt/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries a network error and then succeeds', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(ok);
    const adapter = new WebhookAdapter({ fetchImpl: fetchImpl as any, sleepImpl: noSleep, maxAttempts: 3 });

    await expect(adapter.notify('https://hook.example/x', evidence)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
