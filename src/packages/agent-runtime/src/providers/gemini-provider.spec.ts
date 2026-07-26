/**
 * GT-575 — GeminiProvider is the ONE governed LLM egress path.
 *
 * Every assertion here fails against the pre-fix 57-line provider, which put the
 * API key in the URL query string and had no flag, timeout, budget, redaction,
 * schema validation or audit record.
 */

import {
  GeminiProvider,
  GEMINI_EGRESS_ENV_FLAG,
  GEMINI_EGRESS_HOST,
  type FetchLike,
} from './GeminiProvider';
import {
  LlmEgressBudgetError,
  LlmEgressConfigurationError,
  LlmEgressDisabledError,
  LlmEgressError,
  LlmResponseSchemaError,
  noopLlmEgressAudit,
  type ILlmEgressAudit,
  type LlmEgressAuditEvent,
} from './llm-egress';
import { ArchitecturePlanInterpreter } from '../capabilities/architecture-plan-interpreter';
import { SupervisedAssistantClient } from '../adapters/engine/supervised-assistant.client';
import type { ApprovalDecision, IApprovalPort } from '../domain/ports/approval.port';
import type { IAssistantTransport } from '../domain/ports/assistant-invocation.port';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';

type FetchCall = { url: string; init: Parameters<FetchLike>[1] };

function geminiBody(text: string): unknown {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] };
}

/** A fetch double that records every call and replays a canned response. */
function fakeFetch(
  body: unknown = geminiBody('{"ok":true}'),
  init: { ok?: boolean; status?: number; statusText?: string; raw?: string } = {},
): { fetchImpl: FetchLike; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl: FetchLike = async (url, requestInit) => {
    calls.push({ url, init: requestInit });
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      statusText: init.statusText ?? 'OK',
      text: async () => init.raw ?? JSON.stringify(body),
      json: async () => {
        if (init.raw !== undefined) return JSON.parse(init.raw);
        return body;
      },
    };
  };
  return { fetchImpl, calls };
}

function collectingAudit(): { audit: ILlmEgressAudit; events: LlmEgressAuditEvent[] } {
  const events: LlmEgressAuditEvent[] = [];
  return { audit: { record: (e) => events.push(e) }, events };
}

/** Armed provider with everything injected; tests opt into failure explicitly. */
function armed(overrides: Partial<ConstructorParameters<typeof GeminiProvider>[0] & object> = {}, fetchImpl?: FetchLike) {
  return new GeminiProvider({
    enabled: true,
    apiKey: 'test-key-abc',
    audit: noopLlmEgressAudit,
    fetchImpl: fetchImpl ?? fakeFetch().fetchImpl,
    ...(overrides as object),
  });
}

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('control 1 — network egress is OFF by default', () => {
  it('refuses to contact the endpoint when nothing armed it, and never calls fetch', async () => {
    delete process.env[GEMINI_EGRESS_ENV_FLAG];
    const { fetchImpl, calls } = fakeFetch();
    const provider = new GeminiProvider({ apiKey: 'k', fetchImpl, audit: noopLlmEgressAudit });

    expect(provider.egressEnabled).toBe(false);
    await expect(provider.generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(LlmEgressDisabledError);
    expect(calls).toHaveLength(0);
  });

  it('names the opt-in environment variable in the refusal', async () => {
    delete process.env[GEMINI_EGRESS_ENV_FLAG];
    const provider = new GeminiProvider({ apiKey: 'k', fetchImpl: fakeFetch().fetchImpl, audit: noopLlmEgressAudit });
    await expect(provider.generateStructuredJson('sys', 'user')).rejects.toThrow(
      new RegExp(`${GEMINI_EGRESS_ENV_FLAG}=true`),
    );
  });

  it('arms itself from EVOLITH_LLM_EGRESS=true', async () => {
    process.env[GEMINI_EGRESS_ENV_FLAG] = 'true';
    const { fetchImpl, calls } = fakeFetch();
    const provider = new GeminiProvider({ apiKey: 'k', fetchImpl, audit: noopLlmEgressAudit });

    expect(provider.egressEnabled).toBe(true);
    await provider.generateStructuredJson('sys', 'user');
    expect(calls).toHaveLength(1);
  });

  it('fails closed with no credential rather than sending an unauthenticated request', async () => {
    for (const name of ['EVOLITH_LLM_API_KEY', 'GEMINI_API_KEY']) delete process.env[name];
    const { fetchImpl, calls } = fakeFetch();
    const provider = new GeminiProvider({ enabled: true, fetchImpl, audit: noopLlmEgressAudit });

    await expect(provider.generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(LlmEgressConfigurationError);
    expect(calls).toHaveLength(0);
  });
});

describe('control 2 — the API key travels in a header, never in the URL', () => {
  it('puts the credential in x-goog-api-key and keeps the URL clean', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await armed({ apiKey: 'super-secret-key' }, fetchImpl).generateStructuredJson('sys', 'user');

    const [call] = calls;
    expect(call.init.headers['x-goog-api-key']).toBe('super-secret-key');
    expect(call.url).toBe(`https://${GEMINI_EGRESS_HOST}/v1beta/models/gemini-2.5-flash:generateContent`);
    expect(call.url).not.toContain('super-secret-key');
    expect(call.url).not.toContain('?');
    expect(call.url).not.toMatch(/[?&]key=/);
  });

  it('never leaks the credential through the audited endpoint either', () => {
    const provider = armed({ apiKey: 'super-secret-key' });
    expect(provider.endpoint).not.toContain('super-secret-key');
  });
});

describe('control 3 — every request is bounded in time by an AbortController', () => {
  it('passes an AbortSignal on the request', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await armed({}, fetchImpl).generateStructuredJson('sys', 'user');
    expect(calls[0].init.signal).toBeDefined();
    expect(calls[0].init.signal.aborted).toBe(false);
  });

  it('aborts a hanging call and surfaces a timeout', async () => {
    jest.useFakeTimers();
    try {
      const slowFetch: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
      const provider = armed({ timeoutMs: 5000 }, slowFetch);
      const pending = provider.generateStructuredJson('sys', 'user');
      const assertion = expect(pending).rejects.toThrow(/timed out after 5000ms/);
      jest.advanceTimersByTime(5001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('control 4 — byte/token budget, enforced fail-closed', () => {
  it('refuses an oversized prompt WITHOUT opening a socket', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const provider = armed({ budget: { maxBytes: 500, maxTokens: 10_000 } }, fetchImpl);

    await expect(provider.generateStructuredJson('sys', 'x'.repeat(5000))).rejects.toBeInstanceOf(
      LlmEgressBudgetError,
    );
    expect(calls).toHaveLength(0);
  });

  it('applies a finite default budget even when the caller declares none', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'x'.repeat(70_000))).rejects.toBeInstanceOf(
      LlmEgressBudgetError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('control 5 — secrets are redacted on the way out', () => {
  it('strips a credential embedded in the user prompt before it leaves', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await armed({}, fetchImpl).generateStructuredJson(
      'sys',
      'deploy with GEMINI_API_KEY = "AIzaSyD-1234567890abcdefghijklmnopqrstu"',
    );

    const body = calls[0].init.body;
    expect(body).not.toContain('AIzaSyD-1234567890abcdefghijklmnopqrstu');
    expect(body).toContain('REDACTED');
  });

  it('redacts the system prompt too', async () => {
    const { fetchImpl, calls } = fakeFetch();
    await armed({}, fetchImpl).generateStructuredJson('trust AKIAIOSFODNN7EXAMPLE', 'user');
    expect(calls[0].init.body).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('redacts an error body echoed back by the API', async () => {
    const { fetchImpl } = fakeFetch(undefined, {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      raw: 'invalid request containing ghp_012345678901234567890123456789012345',
    });
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.toThrow(
      /Gemini API error 400/,
    );
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.not.toThrow(
      /ghp_012345678901234567890123456789012345/,
    );
  });
});

describe('control 6 — the response is schema-validated, not cast', () => {
  it('rejects an envelope without candidates instead of returning undefined', async () => {
    const { fetchImpl } = fakeFetch({ promptFeedback: { blockReason: 'SAFETY' } });
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(
      LlmResponseSchemaError,
    );
  });

  it('rejects an envelope whose candidate text is not a string', async () => {
    const { fetchImpl } = fakeFetch({ candidates: [{ content: { parts: [{ text: 42 }] } }] });
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.toThrow(
      /must be a string/,
    );
  });

  it('rejects a model answer that is not JSON', async () => {
    const { fetchImpl } = fakeFetch(geminiBody('I am afraid I cannot do that.'));
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(
      LlmResponseSchemaError,
    );
  });

  it('rejects a model answer that parses but violates the declared contract', async () => {
    const { fetchImpl } = fakeFetch(geminiBody('{"title":"x"}'));
    const interpreter = new ArchitecturePlanInterpreter(armed({}, fetchImpl));
    await expect(interpreter.interpret('add payments')).rejects.toThrow(/\$\.scope is required/);
  });

  it('accepts a conforming architecture plan and records the prompt source', async () => {
    const plan = {
      title: 'Payments',
      scope: { functional: 'f', technical: 't' },
      impact: { components: ['api'], interfaces: ['rest'] },
      risk_assessment: { criticality: 'high', complexity: 'medium', security_risks: [], architectural_risks: [] },
      execution_plan: { suggested_sdlc_phases: ['design'], mandatory_gates: ['f2'] },
    };
    const { fetchImpl } = fakeFetch(geminiBody(JSON.stringify(plan)));
    const interpreter = new ArchitecturePlanInterpreter(armed({}, fetchImpl));

    const result = await interpreter.interpret('add payments');
    expect(result.title).toBe('Payments');
    expect(result.prompt_source).toBe('add payments');
  });

  it('maps a non-2xx status to a typed egress error', async () => {
    const { fetchImpl } = fakeFetch(undefined, { ok: false, status: 429, statusText: 'Too Many Requests', raw: 'slow down' });
    await expect(armed({}, fetchImpl).generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(LlmEgressError);
  });
});

describe('control 7 — every attempt is auditable, and carries no content', () => {
  it('emits a `sent` record with aggregate telemetry only', async () => {
    const { audit, events } = collectingAudit();
    const { fetchImpl } = fakeFetch();
    await armed({ audit }, fetchImpl).generateStructuredJson('sys', 'a very secret business requirement');

    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.event).toBe('llm.egress');
    expect(event.provider).toBe('gemini:gemini-2.5-flash');
    expect(event.endpoint).toContain(GEMINI_EGRESS_HOST);
    expect(event.outcome).toBe('sent');
    expect(event.httpStatus).toBe(200);
    expect(event.requestBytes).toBeGreaterThan(0);
    expect(event.estTokens).toBeGreaterThan(0);
    expect(event.correlationId).toBeTruthy();

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('a very secret business requirement');
    expect(serialized).not.toContain('test-key-abc');
  });

  it('audits the calls that were REFUSED, so "it never happened" is observable', async () => {
    const { audit, events } = collectingAudit();
    delete process.env[GEMINI_EGRESS_ENV_FLAG];
    const provider = new GeminiProvider({ apiKey: 'k', audit, fetchImpl: fakeFetch().fetchImpl });

    await expect(provider.generateStructuredJson('sys', 'user')).rejects.toBeInstanceOf(LlmEgressDisabledError);
    expect(events).toEqual([expect.objectContaining({ outcome: 'refused', reason: 'egress-disabled' })]);
  });

  it('audits a budget refusal with the measured size', async () => {
    const { audit, events } = collectingAudit();
    const provider = armed({ audit, budget: { maxBytes: 200, maxTokens: 10_000 } });
    await expect(provider.generateStructuredJson('sys', 'x'.repeat(4000))).rejects.toBeInstanceOf(
      LlmEgressBudgetError,
    );
    expect(events[0]).toEqual(expect.objectContaining({ outcome: 'refused', reason: 'budget-exceeded' }));
    expect(events[0].requestBytes).toBeGreaterThan(200);
  });

  it('counts the redactions it performed', async () => {
    const { audit, events } = collectingAudit();
    const { fetchImpl } = fakeFetch();
    await armed({ audit }, fetchImpl).generateStructuredJson('sys', 'AKIAIOSFODNN7EXAMPLE');
    expect(events[0].redactions).toBeGreaterThan(0);
  });
});

describe('collapsing the duplicate — GeminiProvider IS an IAssistantTransport', () => {
  const skills: SkillDescriptor[] = [
    { id: 'foo', description: 'Does foo', intents: ['foo'], kind: 'harness', permissions: [], requiresApproval: false, emitsTrace: true, requiresPolicy: false },
  ];
  const request: AgentRuntimeRequest = {
    intent: 'do the thing',
    parameters: { a: 1 },
    context: { tenantId: 'tenant-super-secret', productId: 'prod-1', workspaceRef: 'ws://private' },
  };
  const grantAll: IApprovalPort = {
    requireApproval: async (): Promise<ApprovalDecision> => ({ granted: true, approver: 'alice' }),
  };
  const denyAll: IApprovalPort = {
    requireApproval: async (): Promise<ApprovalDecision> => ({ granted: false, status: 'rejected' }),
  };

  it('satisfies the IAssistantTransport port structurally', () => {
    const transport: IAssistantTransport = armed({});
    expect(typeof transport.invoke).toBe('function');
  });

  it('returns a schema-validated proposal bounded to the governed catalog', async () => {
    const { fetchImpl, calls } = fakeFetch(geminiBody('{"tool":"foo","arguments":{"a":1},"rationale":"because"}'));
    const proposal = await armed({}, fetchImpl).invoke({ request, availableSkills: skills });

    expect(proposal).toEqual({ tool: 'foo', arguments: { a: 1 }, rationale: 'because' });
    expect(calls[0].init.body).toContain('foo: Does foo'); // the catalog bounds the ask
  });

  it('minimizes data: tenant/product/workspace context never leaves the process', async () => {
    const { fetchImpl, calls } = fakeFetch(geminiBody('{"tool":"foo"}'));
    await armed({}, fetchImpl).invoke({ request, availableSkills: skills });

    const body = calls[0].init.body;
    expect(body).not.toContain('tenant-super-secret');
    expect(body).not.toContain('prod-1');
    expect(body).not.toContain('ws://private');
    expect(body).toContain('do the thing');
  });

  it('rejects an off-schema proposal instead of forwarding it', async () => {
    const { fetchImpl } = fakeFetch(geminiBody('{"tool":{"nested":"nope"}}'));
    await expect(armed({}, fetchImpl).invoke({ request, availableSkills: skills })).rejects.toBeInstanceOf(
      LlmResponseSchemaError,
    );
  });

  it('behind SupervisedAssistantClient, an APPROVED request reaches Gemini once', async () => {
    const { fetchImpl, calls } = fakeFetch(geminiBody('{"tool":"foo","rationale":"assistant picked foo"}'));
    const client = new SupervisedAssistantClient({
      enabled: true,
      approval: grantAll,
      transport: armed({}, fetchImpl),
    });

    const proposal = await client.propose(request, skills);
    expect(calls).toHaveLength(1);
    expect(proposal.tool).toBe('foo');
    expect(proposal.rationale).toContain('alice');
  });

  it('behind SupervisedAssistantClient, a DENIED request never touches the network', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const client = new SupervisedAssistantClient({
      enabled: true,
      approval: denyAll,
      transport: armed({}, fetchImpl),
    });

    const proposal = await client.propose(request, skills);
    expect(calls).toHaveLength(0);
    expect(proposal.tool).toBeUndefined();
  });

  it('a disarmed transport degrades to fail-closed rather than throwing at the runtime', async () => {
    delete process.env[GEMINI_EGRESS_ENV_FLAG];
    const { fetchImpl, calls } = fakeFetch();
    const client = new SupervisedAssistantClient({
      enabled: true,
      approval: grantAll,
      transport: new GeminiProvider({ apiKey: 'k', fetchImpl, audit: noopLlmEgressAudit }),
    });

    const proposal = await client.propose(request, skills);
    expect(calls).toHaveLength(0);
    expect(proposal.tool).toBeUndefined();
    expect(proposal.rationale).toContain('fail-closed');
  });
});
