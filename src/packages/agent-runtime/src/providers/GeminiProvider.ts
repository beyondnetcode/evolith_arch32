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
 *   8. SUPERVISED — no socket opens unless a HITL gate granted this specific
 *      call. This is what collapses the duplicate port: there is now ONE way to
 *      reach an LLM from this package, and it always passes a human gate.
 *
 * This class is an {@link IAssistantTransport} — the architecturally correct
 * seam. Inject it into {@link SupervisedAssistantClient}: that client asks a
 * human for approval, stamps the decision on the invocation, and only then is
 * the transport reached; whatever it proposes is still bounded by the governed
 * skill catalog downstream. THAT IS THE INTENDED (and only recommended) WAY TO
 * USE IT.
 *
 * `generateStructuredJson` survives ONLY because the published 1.x contract has
 * an `ILLMProvider`-shaped consumer (`ArchitecturePlanInterpreter`, the CLI
 * `plan create` command) and removing it would be a SemVer major. It is no
 * longer a second, ungoverned port: it now demands the SAME supervision as the
 * transport seam, satisfied by an {@link IApprovalPort} injected through
 * {@link GeminiProviderOptions.approval}. Without a gate it fails closed with
 * {@link LlmEgressUnsupervisedError} — a bare provider cannot reach the network
 * through either seam.
 *
 * NETWORK EGRESS: when and only when armed AND supervised, this class performs
 * an outbound HTTPS POST to
 * `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
 * (Google is the sub-processor). See the class constants for the opt-in flag.
 */

import { buildAssistantSystemPrompt } from '../prompts/assistant-invocation.prompt';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type {
  AssistantInvocationRequest,
  AssistantProposal,
  AssistantSupervision,
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
  LlmEgressUnsupervisedError,
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

/**
 * Id of the synthetic capability an approver decides on when the deprecated
 * `generateStructuredJson` seam asks for its own HITL grant. An approval policy
 * adapter matches on this id exactly as it does on `assistant.invoke`.
 */
export const LLM_STRUCTURED_JSON_SKILL_ID = 'llm.generate-structured-json';

/** What the human is asked to approve. Carries NO prompt content, by construction. */
const STRUCTURED_JSON_SKILL: SkillDescriptor = {
  id: LLM_STRUCTURED_JSON_SKILL_ID,
  description: 'Send a prompt to an external LLM provider and obtain structured JSON (supervised).',
  intents: ['generate_structured_json'],
  kind: 'composite',
  permissions: ['invoke:assistant'],
  requiresApproval: true,
  emitsTrace: true,
  requiresPolicy: false,
};

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
  /**
   * The HITL gate for calls that do NOT arrive through
   * {@link SupervisedAssistantClient} — i.e. the deprecated
   * `generateStructuredJson` seam, and a direct `invoke` (GT-575). Absent ⇒
   * those calls fail closed with {@link LlmEgressUnsupervisedError}; supervision
   * is never self-granted.
   *
   * When the invocation already carries an {@link AssistantSupervision} grant
   * this port is NOT consulted — one call, one human prompt.
   */
  readonly approval?: IApprovalPort;
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

/**
 * What the governed core needs in order to prove this specific call was
 * supervised: the grant carried by the invocation (when it came through
 * {@link SupervisedAssistantClient}) and the request an approver would decide
 * on if this provider has to run the gate itself.
 */
interface EgressGateContext {
  readonly supervision?: AssistantSupervision;
  readonly request: AgentRuntimeRequest;
}

/** Result of the supervision gate — never a thrown control flow inside the core. */
type SupervisionOutcome =
  | { readonly ok: true; readonly supervisedBy: string }
  | { readonly ok: false; readonly reason: 'unsupervised' | 'approval-denied'; readonly message: string };

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

export class GeminiProvider implements IAssistantTransport {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly host: string;
  private readonly enabled: boolean;
  private readonly approval?: IApprovalPort;
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
    this.approval = options.approval;
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
   * Legacy `ILLMProvider`-shaped seam — DEPRECATED in favour of {@link invoke}
   * behind {@link SupervisedAssistantClient}. Kept only because the published
   * 1.x contract exposes it, and now subject to the SAME supervision: it needs
   * an {@link IApprovalPort} injected through {@link GeminiProviderOptions.approval}
   * and fails closed with {@link LlmEgressUnsupervisedError} without one.
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
    const text = await this.callGemini(systemPrompt, userPrompt, 'structured-json', {
      // The approver sees WHAT is being contacted, never the prompt itself.
      request: {
        intent: 'generate_structured_json',
        tool: LLM_STRUCTURED_JSON_SKILL_ID,
        context: {},
        parameters: { provider: `gemini:${this.model}`, endpoint: this.endpoint },
      },
    });
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
   *
   * SUPERVISION (GT-575): the call proceeds only if the invocation carries an
   * {@link AssistantSupervision} grant — which {@link SupervisedAssistantClient}
   * stamps after its HITL gate — or the provider was given its own approval
   * port. Reaching this method directly with neither is a bypass, and is
   * refused.
   */
  async invoke(request: AssistantInvocationRequest): Promise<AssistantProposal> {
    // The prompt text lives in `src/prompts` (AAI-R03): prompt sources are kept
    // out of the implementation roots so a change to what the model is told is
    // reviewable on its own.
    const systemPrompt = buildAssistantSystemPrompt(request.availableSkills);

    // Data minimization: the tenant/product/initiative context never leaves.
    const userPrompt = JSON.stringify({
      intent: request.request.intent,
      tool: request.request.tool,
      parameters: request.request.parameters,
      dryRun: request.request.dryRun ?? false,
    });

    const text = await this.callGemini(systemPrompt, userPrompt, 'assistant-invoke', {
      supervision: request.supervision,
      request: request.request,
    });
    const proposal = parseAndValidateJson<{
      tool?: string;
      arguments?: Record<string, unknown>;
      rationale?: string;
    }>(text, ASSISTANT_PROPOSAL_SCHEMA);

    return { tool: proposal.tool, arguments: proposal.arguments, rationale: proposal.rationale };
  }

  /* ───────────────── the single governed egress core ───────────────── */

  /**
   * The one place both seams prove they were supervised. Returns the gate that
   * granted (for the audit trail) or throws — supervision is never assumed and
   * never self-granted.
   */
  private async resolveSupervision(gate: EgressGateContext): Promise<SupervisionOutcome> {
    if (gate.supervision?.granted) {
      const supervisedBy = gate.supervision.approver
        ? `${gate.supervision.gate}:${gate.supervision.approver}`
        : gate.supervision.gate;
      return { ok: true, supervisedBy };
    }

    if (!this.approval) {
      return {
        ok: false,
        reason: 'unsupervised',
        message:
          'LLM egress is not supervised: no human gate ran in front of this call. Inject this provider as the ' +
          'IAssistantTransport of SupervisedAssistantClient (recommended), or give it an IApprovalPort via ' +
          '`new GeminiProvider({ approval })`. Failing closed.',
      };
    }

    const decision = await this.approval.requireApproval({
      skill: STRUCTURED_JSON_SKILL,
      request: gate.request,
    });
    if (!decision.granted) {
      const status = decision.status ? ` (${decision.status})` : '';
      const reason = decision.reason ? `: ${decision.reason}` : '';
      return {
        ok: false,
        reason: 'approval-denied',
        message: `Contacting the external LLM was not approved${status}${reason}; nothing was sent (fail-closed).`,
      };
    }
    return { ok: true, supervisedBy: decision.approver ? `IApprovalPort:${decision.approver}` : 'IApprovalPort' };
  }

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    purpose: string,
    gate: EgressGateContext,
  ): Promise<string> {
    const started = this.now();
    const startedAt = new Date(started).toISOString();
    const endpoint = this.endpoint;
    /** Set once the supervision gate grants; recorded on every later event. */
    let supervisedBy: string | undefined;

    const emit = (
      partial: Omit<
        LlmEgressAuditEvent,
        'event' | 'provider' | 'endpoint' | 'purpose' | 'startedAt' | 'correlationId' | 'supervisedBy'
      >,
    ): void => {
      this.audit.record({
        event: 'llm.egress',
        provider: `gemini:${this.model}`,
        endpoint,
        purpose,
        startedAt,
        correlationId: this.correlationId,
        ...(supervisedBy ? { supervisedBy } : {}),
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

    // Control 2 — SUPERVISED. Either the supervised client already got a human
    // YES for this call, or this provider has its own HITL gate that grants.
    // Neither ⇒ nothing is sent, and the refusal is audited.
    const supervision = await this.resolveSupervision(gate);
    if (!supervision.ok) {
      emit({
        outcome: 'refused',
        reason: supervision.reason,
        requestBytes: 0,
        estTokens: 0,
        redactions: 0,
      });
      throw new LlmEgressUnsupervisedError(supervision.message);
    }
    supervisedBy = supervision.supervisedBy;

    // Control 3 — no credential, no call.
    if (!this.apiKey) {
      emit({ outcome: 'refused', reason: 'missing-api-key', requestBytes: 0, estTokens: 0, redactions: 0 });
      throw new LlmEgressConfigurationError(
        `Gemini egress requires an API key (${GEMINI_API_KEY_ENV_VARS.join('/')}). Failing closed.`,
      );
    }

    // Control 4 — redact BEFORE anything is serialized for the wire.
    const system = redactSecrets(systemPrompt);
    const user = redactSecrets(userPrompt);
    const redactions = system.redactions + user.redactions;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system.text }] },
      contents: [{ parts: [{ text: user.text }] }],
      generationConfig: { response_mime_type: 'application/json' },
    });

    // Control 5 — budget over the exact bytes to be sent. Fail closed.
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

    // Control 6 — bounded in time.
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

    // Control 7 — the envelope is validated, not assumed.
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
