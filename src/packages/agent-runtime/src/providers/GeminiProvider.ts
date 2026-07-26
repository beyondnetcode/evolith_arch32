/**
 * GeminiProvider (GT-575) — the ONE governed egress path to Google Gemini.
 *
 * Every control below is ported from the implementation this repository already
 * runs against itself in `.harness/scripts/ci/agentic/`; the shipped path had
 * none of them:
 *
 *   1. OFF BY DEFAULT — the provider refuses to open a socket unless egress is
 *      armed explicitly (`enabled: true`, or `EVOLITH_LLM_EGRESS=true`). Same
 *      posture as {@link SupervisedAssistantClient}: contacting an external AI
 *      with a tenant's request is itself a governed action.
 *   2. Credentials travel in the `x-goog-api-key` HEADER, never in the URL
 *      query string (URLs land in proxy logs, traces and crash reports).
 *   3. An {@link AbortController} bounds every request with a timeout.
 *   4. Byte/token BUDGET enforced over the exact bytes to be sent — fail-closed,
 *      never truncated.
 *   5. Secret REDACTION over both prompts before they leave the process.
 *   6. The response is validated against a declared SCHEMA — both the Gemini
 *      envelope and the inner JSON payload — instead of `JSON.parse(x) as T`.
 *   7. Every attempt, including refusals, emits an auditable, content-free
 *      {@link LlmEgressAuditEvent}.
 *
 * It implements BOTH seams so there is one governed path to an LLM:
 *   - {@link IAssistantTransport} — the architecturally correct seam. Injected
 *     into {@link SupervisedAssistantClient}, so a real call happens only after
 *     a human APPROVES contacting the assistant (HITL), and the proposal is
 *     still bounded by the governed skill catalog downstream. THIS IS THE
 *     INTENDED WAY TO USE IT.
 *   - {@link ILLMProvider} — the legacy, deprecated seam kept for the published
 *     1.x contract (`ArchitecturePlanInterpreter`, the CLI `plan create`
 *     command). It now runs through the exact same governed core, so it is no
 *     longer a bypass; it simply lacks the HITL gate that the transport seam
 *     gets from the supervised client.
 *
 * NETWORK EGRESS: when and only when armed, this class performs an outbound
 * HTTPS POST to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
 * (Google is the sub-processor). See the class constants for the opt-in flag.
 */

import type { ILLMProvider } from './ILLMProvider';
import type {
  AssistantInvocationRequest,
  AssistantProposal,
  IAssistantTransport,
} from '../domain/ports/assistant-invocation.port';
import {
  consoleLlmEgressAudit,
  DEFAULT_EGRESS_BUDGET,
  enforceEgressBudget,
  JSON_OBJECT_SCHEMA,
  LlmEgressConfigurationError,
  LlmEgressDisabledError,
  LlmEgressError,
  LlmResponseSchemaError,
  parseAndValidateJson,
  redactSecrets,
  validateJsonSchema,
  type EgressBudget,
  type ILlmEgressAudit,
  type JsonSchemaNode,
  type LlmEgressAuditEvent,
} from './llm-egress';

/** Host contacted when — and only when — egress is armed. */
export const GEMINI_EGRESS_HOST = 'generativelanguage.googleapis.com';

/** The single environment variable that opts a process into LLM egress. Default: unset ⇒ OFF. */
export const GEMINI_EGRESS_ENV_FLAG = 'EVOLITH_LLM_EGRESS';

/** Environment variables read for the credential, in order. */
export const GEMINI_API_KEY_ENV_VARS = ['EVOLITH_LLM_API_KEY', 'GEMINI_API_KEY'] as const;

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
export const GEMINI_DEFAULT_TIMEOUT_MS = 30_000;

/** Minimal structural view of `fetch`, injected so the egress path is testable. */
export type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

export interface GeminiProviderOptions {
  readonly apiKey?: string;
  readonly model?: string;
  /** Hostname only (no scheme, no credentials). Defaults to {@link GEMINI_EGRESS_HOST}. */
  readonly host?: string;
  /**
   * Arms network egress. Default: `process.env.EVOLITH_LLM_EGRESS === 'true'`
   * (i.e. OFF). There is no implicit way to enable it.
   */
  readonly enabled?: boolean;
  readonly timeoutMs?: number;
  readonly budget?: EgressBudget;
  readonly fetchImpl?: FetchLike;
  readonly audit?: ILlmEgressAudit;
  readonly now?: () => number;
  readonly correlationId?: string;
}

/** The Gemini `generateContent` envelope, DECLARED rather than assumed. */
export const GEMINI_RESPONSE_SCHEMA: JsonSchemaNode = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'object',
            required: ['parts'],
            properties: {
              parts: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['text'],
                  properties: { text: { type: 'string', minLength: 1 } },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** The proposal shape the assistant transport seam accepts back. */
export const ASSISTANT_PROPOSAL_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    arguments: { type: 'object' },
    rationale: { type: 'string' },
  },
};

interface GeminiEnvelope {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

/** The real network call. Isolated so the governed core above it stays testable. */
const defaultFetch: FetchLike = (input, init) =>
  fetch(input, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: init.signal,
  });

function envFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function resolveEnvKey(): string {
  for (const name of GEMINI_API_KEY_ENV_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

export class GeminiProvider implements ILLMProvider, IAssistantTransport {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly host: string;
  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly budget: EgressBudget;
  private readonly fetchImpl: FetchLike;
  private readonly audit: ILlmEgressAudit;
  private readonly now: () => number;
  private readonly correlationId: string;

  /** @deprecated positional form — kept for the published 1.x contract. Prefer the options object. */
  constructor(apiKey?: string, model?: string);
  constructor(options: GeminiProviderOptions);
  constructor(apiKeyOrOptions?: string | GeminiProviderOptions, model?: string) {
    const options: GeminiProviderOptions =
      typeof apiKeyOrOptions === 'string' || apiKeyOrOptions === undefined
        ? { apiKey: apiKeyOrOptions, model }
        : apiKeyOrOptions;

    this.apiKey = options.apiKey || resolveEnvKey();
    this.model = options.model || GEMINI_DEFAULT_MODEL;
    this.host = options.host || GEMINI_EGRESS_HOST;
    // OFF BY DEFAULT. Only an explicit option or the opt-in env var arms it.
    this.enabled = options.enabled ?? envFlagEnabled(process.env[GEMINI_EGRESS_ENV_FLAG]);
    this.timeoutMs = options.timeoutMs ?? GEMINI_DEFAULT_TIMEOUT_MS;
    this.budget = options.budget ?? DEFAULT_EGRESS_BUDGET;
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
    this.audit = options.audit ?? consoleLlmEgressAudit;
    this.now = options.now ?? (() => Date.now());
    this.correlationId = options.correlationId ?? `llm-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Absolute endpoint this provider would contact. Never carries the credential. */
  get endpoint(): string {
    return `https://${this.host}/v1beta/models/${this.model}:generateContent`;
  }

  /** True when egress is armed. Exposed so a host can surface the posture. */
  get egressEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Legacy {@link ILLMProvider} seam — DEPRECATED in favour of {@link invoke}
   * behind {@link SupervisedAssistantClient}, but now fully governed.
   *
   * @param schema declared shape for the model's JSON answer. Defaults to
   *   "must be a JSON object", which is still strictly stronger than the
   *   `JSON.parse(x) as T` it replaces.
   */
  async generateStructuredJson<T = any>(
    systemPrompt: string,
    userPrompt: string,
    schema: JsonSchemaNode = JSON_OBJECT_SCHEMA,
  ): Promise<T> {
    const text = await this.callGemini(systemPrompt, userPrompt, 'structured-json');
    return parseAndValidateJson<T>(text, schema);
  }

  /**
   * {@link IAssistantTransport} seam — the governed one. Only the request's
   * INTENT, tool and parameters plus the bounded skill catalog leave the
   * process; the tenant/product/initiative context and the workspace reference
   * deliberately do NOT (data minimization).
   *
   * Per the port contract a transport failure THROWS; the supervised client
   * turns that throw into a fail-closed "proposed nothing".
   */
  async invoke(request: AssistantInvocationRequest): Promise<AssistantProposal> {
    const catalog = request.availableSkills
      .map((skill) => `- ${skill.id}: ${skill.description}`)
      .join('\n');

    const systemPrompt = [
      'You are a bounded proposal engine for the Evolith Agent Runtime.',
      'You may ONLY propose a capability whose id appears in the catalog below; anything else is rejected downstream.',
      'You never execute anything: you propose, and a governed runtime decides.',
      '',
      'Governed capability catalog:',
      catalog || '(empty catalog — propose nothing)',
      '',
      'Answer with ONLY a single JSON object, no prose and no markdown fences:',
      '{ "tool": "<capability id from the catalog, or omit>", "arguments": { }, "rationale": "<short reason>" }',
    ].join('\n');

    // Data minimization: the tenant/product/initiative context never leaves.
    const userPrompt = JSON.stringify({
      intent: request.request.intent,
      tool: request.request.tool,
      parameters: request.request.parameters,
      dryRun: request.request.dryRun ?? false,
    });

    const text = await this.callGemini(systemPrompt, userPrompt, 'assistant-invoke');
    const proposal = parseAndValidateJson<{
      tool?: string;
      arguments?: Record<string, unknown>;
      rationale?: string;
    }>(text, ASSISTANT_PROPOSAL_SCHEMA);

    return { tool: proposal.tool, arguments: proposal.arguments, rationale: proposal.rationale };
  }

  /* ───────────────── the single governed egress core ───────────────── */

  private async callGemini(systemPrompt: string, userPrompt: string, purpose: string): Promise<string> {
    const started = this.now();
    const startedAt = new Date(started).toISOString();
    const endpoint = this.endpoint;

    const emit = (
      partial: Omit<LlmEgressAuditEvent, 'event' | 'provider' | 'endpoint' | 'purpose' | 'startedAt' | 'correlationId'>,
    ): void => {
      this.audit.record({
        event: 'llm.egress',
        provider: `gemini:${this.model}`,
        endpoint,
        purpose,
        startedAt,
        correlationId: this.correlationId,
        ...partial,
      });
    };

    // Control 1 — OFF by default. Refused attempts are audited too.
    if (!this.enabled) {
      emit({ outcome: 'refused', reason: 'egress-disabled', requestBytes: 0, estTokens: 0, redactions: 0 });
      throw new LlmEgressDisabledError(
        `LLM network egress is disabled by default. Set ${GEMINI_EGRESS_ENV_FLAG}=true (or pass { enabled: true }) ` +
          `to allow this process to contact ${endpoint}.`,
      );
    }

    // Control 2 — no credential, no call.
    if (!this.apiKey) {
      emit({ outcome: 'refused', reason: 'missing-api-key', requestBytes: 0, estTokens: 0, redactions: 0 });
      throw new LlmEgressConfigurationError(
        `Gemini egress requires an API key (${GEMINI_API_KEY_ENV_VARS.join('/')}). Failing closed.`,
      );
    }

    // Control 3 — redact BEFORE anything is serialized for the wire.
    const system = redactSecrets(systemPrompt);
    const user = redactSecrets(userPrompt);
    const redactions = system.redactions + user.redactions;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system.text }] },
      contents: [{ parts: [{ text: user.text }] }],
      generationConfig: { response_mime_type: 'application/json' },
    });

    // Control 4 — budget over the exact bytes to be sent. Fail closed.
    let usage;
    try {
      usage = enforceEgressBudget(body, this.budget);
    } catch (err) {
      const bytes = Buffer.byteLength(body, 'utf8');
      emit({
        outcome: 'refused',
        reason: 'budget-exceeded',
        requestBytes: bytes,
        estTokens: Math.ceil(bytes / 4),
        redactions,
      });
      throw err;
    }

    // Control 5 — bounded in time.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // API key in a header, not the URL query string.
          'x-goog-api-key': this.apiKey,
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      const message = timedOut
        ? `timed out after ${this.timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
      emit({
        outcome: 'error',
        reason: timedOut ? 'timeout' : 'network',
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        durationMs: this.now() - started,
      });
      throw new LlmEgressError(`Gemini request failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      emit({
        outcome: 'error',
        reason: 'http-status',
        httpStatus: response.status,
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        durationMs: this.now() - started,
      });
      // The error body is redacted too — Google echoes request fragments back.
      throw new LlmEgressError(
        `Gemini API error ${response.status} ${response.statusText}: ${redactSecrets(detail).text.slice(0, 500)}`,
      );
    }

    // Control 6 — the envelope is validated, not assumed.
    let raw: unknown;
    try {
      raw = await response.json();
    } catch (err) {
      emit({
        outcome: 'error',
        reason: 'unparseable-body',
        httpStatus: response.status,
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        durationMs: this.now() - started,
      });
      throw new LlmResponseSchemaError('Gemini response body is not JSON', [
        err instanceof Error ? err.message : String(err),
      ]);
    }

    const errors = validateJsonSchema(raw, GEMINI_RESPONSE_SCHEMA);
    if (errors.length > 0) {
      emit({
        outcome: 'error',
        reason: 'schema-violation',
        httpStatus: response.status,
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        durationMs: this.now() - started,
      });
      throw new LlmResponseSchemaError('Gemini response envelope failed schema validation', errors);
    }

    emit({
      outcome: 'sent',
      httpStatus: response.status,
      requestBytes: usage.bytes,
      estTokens: usage.estTokens,
      redactions,
      durationMs: this.now() - started,
    });

    return (raw as GeminiEnvelope).candidates[0].content.parts[0].text;
  }
}
