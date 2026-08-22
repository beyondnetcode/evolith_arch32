/**
 * ClaudeProvider — an {@link IAssistantTransport} that reaches Anthropic's
 * Messages API, under the SAME governance as every other transport (ADR-0128).
 *
 * WHY THIS FILE DOES NOT REIMPLEMENT THE CONTROLS. The governed egress core lives
 * in `llm-egress` (GT-575): redaction, a fail-closed byte/token budget, schema
 * validation of whatever comes back, and a content-free audit record for every
 * attempt — including refused ones. A second provider that re-implemented any of
 * that would be a second policy, and two policies drift. This class contributes
 * only what is genuinely vendor-specific: the endpoint, the request shape, and
 * how to read the text back out.
 *
 * The posture it inherits, and must not weaken:
 *   1. OFF BY DEFAULT — no socket opens unless egress is armed explicitly
 *      (`enabled: true`, or `EVOLITH_LLM_EGRESS=true`). Contacting an external
 *      model with a tenant's request is itself a governed action.
 *   2. SUPERVISED — the call is refused unless a HITL gate granted THIS
 *      invocation. Supervision is never self-granted.
 *   3. The credential travels in a header, never in a URL (URLs land in proxy
 *      logs, traces and crash reports).
 *   4. Data minimization: the tenant/product/initiative context never leaves.
 *      Only the intent, the tool and its parameters do.
 *
 * THE SDK IS LOADED LAZILY, on purpose. `@anthropic-ai/sdk` is not a dependency
 * of this package: the package must build and the runtime must boot with no
 * vendor SDK installed at all — the same rule `HermesAgentAdapter` follows. A
 * missing SDK is therefore a first-class, actionable state ("install it"), not a
 * cryptic module-not-found at request time.
 */

import { buildAssistantSystemPrompt } from '../prompts/assistant-invocation.prompt';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type {
  IAssistantTransport,
  AssistantInvocationRequest,
  AssistantProposal,
  AssistantUsage,
} from '../domain/ports/assistant-invocation.port';
import {
  redactSecrets,
  enforceEgressBudget,
  parseAndValidateJson,
  DEFAULT_EGRESS_BUDGET,
  LlmEgressDisabledError,
  LlmEgressUnsupervisedError,
  LlmEgressConfigurationError,
  LlmEgressError,
  type EgressBudget,
  type JsonSchemaNode,
  type ILlmEgressAudit,
  type LlmEgressOutcome,
} from './llm-egress';
import { consoleLlmEgressAudit } from './llm-egress';

/** Anthropic's Messages API host. Recorded in the audit trail, never in a URL with a key. */
export const CLAUDE_EGRESS_HOST = 'api.anthropic.com';

/** Same arming flag as every other transport — one switch governs egress, not one per vendor. */
export const CLAUDE_EGRESS_ENV_FLAG = 'EVOLITH_LLM_EGRESS';

/**
 * `ANTHROPIC_API_KEY` first — the name the Anthropic SDK and CLI already use, so an
 * environment configured for Claude anywhere else works here unchanged.
 * `EVOLITH_LLM_API_KEY` is accepted second for installs that carry one generic key.
 */
export const CLAUDE_API_KEY_ENV_VARS = ['ANTHROPIC_API_KEY', 'EVOLITH_LLM_API_KEY'] as const;

export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5';
export const CLAUDE_DEFAULT_TIMEOUT_MS = 60_000;
export const CLAUDE_DEFAULT_MAX_TOKENS = 16_000;

/**
 * What an approver is deciding on when the gate runs here. A human approving
 * "contact an external model" deserves to see that, not an opaque id.
 */
export const CLAUDE_INVOKE_SKILL: SkillDescriptor = {
  id: 'llm.assistant-invoke',
  description: 'Contact Claude to propose which governed skill answers this intent (supervised).',
  intents: ['assistant_invoke'],
  kind: 'composite',
  permissions: ['invoke:assistant'],
  requiresApproval: true,
  emitsTrace: true,
  requiresPolicy: false,
};

/** The shape a proposal must have coming back — validated, never cast. */
export const CLAUDE_PROPOSAL_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    arguments: { type: 'object' },
    rationale: { type: 'string' },
  },
};

export interface ClaudeProviderOptions {
  readonly apiKey?: string;
  readonly model?: string;
  /** Off unless explicitly armed here or via `EVOLITH_LLM_EGRESS`. */
  readonly enabled?: boolean;
  /**
   * The HITL gate. A transport reaching an external provider REFUSES when the
   * invocation carries no grant and no port is available to obtain one.
   */
  readonly approval?: IApprovalPort;
  readonly audit?: ILlmEgressAudit;
  readonly timeoutMs?: number;
  readonly maxTokens?: number;
  readonly budget?: EgressBudget;
}

function envFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function resolveApiKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  for (const name of CLAUDE_API_KEY_ENV_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export class ClaudeProvider implements IAssistantTransport {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly approval?: IApprovalPort;
  private readonly audit: ILlmEgressAudit;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private readonly budget: EgressBudget;

  constructor(options: ClaudeProviderOptions = {}) {
    this.apiKey = resolveApiKey(options.apiKey);
    this.model = options.model ?? CLAUDE_DEFAULT_MODEL;
    this.enabled = options.enabled ?? envFlagEnabled(process.env[CLAUDE_EGRESS_ENV_FLAG]);
    this.approval = options.approval;
    this.audit = options.audit ?? consoleLlmEgressAudit;
    this.timeoutMs = options.timeoutMs ?? CLAUDE_DEFAULT_TIMEOUT_MS;
    this.maxTokens = options.maxTokens ?? CLAUDE_DEFAULT_MAX_TOKENS;
    this.budget = options.budget ?? DEFAULT_EGRESS_BUDGET;
  }

  /** Whether this transport would open a socket at all. */
  isEnabled(): boolean {
    return this.enabled;
  }

  async invoke(request: AssistantInvocationRequest): Promise<AssistantProposal> {
    const startedAt = new Date().toISOString();
    const correlationId = `claude-${startedAt}-${Math.random().toString(36).slice(2, 10)}`;
    const started = Date.now();

    const emit = (
      outcome: LlmEgressOutcome,
      extra: {
        reason?: string;
        requestBytes?: number;
        estTokens?: number;
        redactions?: number;
        httpStatus?: number;
        supervisedBy?: string;
      } = {},
    ): void => {
      this.audit.record({
        event: 'llm.egress',
        provider: 'claude',
        endpoint: CLAUDE_EGRESS_HOST,
        purpose: 'assistant-invoke',
        outcome,
        requestBytes: extra.requestBytes ?? 0,
        estTokens: extra.estTokens ?? 0,
        redactions: extra.redactions ?? 0,
        durationMs: Date.now() - started,
        startedAt,
        correlationId,
        ...extra,
      });
    };

    // 1. OFF BY DEFAULT.
    if (!this.enabled) {
      emit('refused', { reason: 'egress-disabled' });
      throw new LlmEgressDisabledError(
        `Claude egress is disabled. Arm it with ${CLAUDE_EGRESS_ENV_FLAG}=true or { enabled: true }.`,
      );
    }

    // 2. SUPERVISED. A grant carried by the invocation is proof the gate already
    //    ran; without one this transport does not self-grant, it refuses.
    const supervisedBy = await this.resolveSupervision(request, emit);

    // 3. Whose credential, and which model. A tenant's selection wins over the
    //    installation's, per call and only for this call (ADR-0128 §2) — the Core
    //    is stateless, so nothing here is retained afterwards.
    const selection = request.providerSelection;
    const apiKey = selection?.apiKey ?? this.apiKey;
    const model = selection?.model ?? this.model;

    if (!apiKey) {
      emit('refused', { reason: 'missing-credential', supervisedBy });
      throw new LlmEgressConfigurationError(
        selection
          ? `The tenant selected Claude but supplied no credential, and this installation has none configured. Set one of: ${CLAUDE_API_KEY_ENV_VARS.join(', ')}, or send it with the selection.`
          : `No Claude credential. Set one of: ${CLAUDE_API_KEY_ENV_VARS.join(', ')}.`,
      );
    }

    const systemPrompt = buildAssistantSystemPrompt(request.availableSkills);
    // Data minimization: tenant/product/initiative never leave the process.
    const userPrompt = JSON.stringify({
      intent: request.request.intent,
      tool: request.request.tool,
      parameters: request.request.parameters,
    });

    // 4. Redaction, then 5. a fail-closed budget over the exact bytes to be sent.
    const redactedSystem = redactSecrets(systemPrompt);
    const redactedUser = redactSecrets(userPrompt);
    const redactions = redactedSystem.redactions + redactedUser.redactions;
    const payload = `${redactedSystem.text}\n${redactedUser.text}`;
    const usage = enforceEgressBudget(payload, this.budget); // throws LlmEgressBudgetError

    try {
      const answer = await this.callClaude(redactedSystem.text, redactedUser.text, apiKey, model);
      // 6. Validate against the declared schema instead of casting a JSON.parse.
      const proposal = parseAndValidateJson<AssistantProposal>(answer.text, CLAUDE_PROPOSAL_SCHEMA);
      emit('sent', {
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        httpStatus: 200,
        supervisedBy,
      });
      // The tokens the PROVIDER counted, not our pre-flight estimate: the estimate
      // bounds what we may send, the report says what was actually spent, and only
      // the second one may reach an invoice.
      return { ...proposal, usage: answer.usage };
    } catch (err) {
      const status = (err as { status?: number }).status;
      emit('error', {
        reason: err instanceof Error ? err.message : String(err),
        requestBytes: usage.bytes,
        estTokens: usage.estTokens,
        redactions,
        httpStatus: typeof status === 'number' ? status : undefined,
        supervisedBy,
      });
      if (err instanceof LlmEgressError) throw err;
      // A transport failure is THROWN, never swallowed: the caller maps a throw to
      // "the assistant could not be reached", distinct from "proposed nothing".
      throw new LlmEgressError(
        `Claude transport failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Returns who supervised this call, or throws. Supervision is never assumed. */
  private async resolveSupervision(
    request: AssistantInvocationRequest,
    emit: (outcome: LlmEgressOutcome, extra?: { reason?: string }) => void,
  ): Promise<string> {
    const carried = request.supervision;
    if (carried?.granted) {
      return carried.approver ? `${carried.gate}:${carried.approver}` : carried.gate;
    }
    if (!this.approval) {
      emit('refused', { reason: 'unsupervised' });
      throw new LlmEgressUnsupervisedError(
        'Claude egress requires a granted HITL approval; none was carried and no approval port is wired.',
      );
    }
    const decision = await this.approval.requireApproval({
      skill: CLAUDE_INVOKE_SKILL,
      request: request.request,
    });
    if (!decision.granted) {
      const status = decision.status ? ` (${decision.status})` : '';
      const reason = decision.reason ? `: ${decision.reason}` : '';
      emit('refused', { reason: 'approval-denied' });
      throw new LlmEgressUnsupervisedError(
        `Contacting Claude was not approved${status}${reason}; nothing was sent (fail-closed).`,
      );
    }
    return decision.approver ? `IApprovalPort:${decision.approver}` : 'IApprovalPort';
  }

  /**
   * The only vendor-specific step. The SDK is imported lazily so this package
   * builds and boots without it; a missing SDK reports what to install rather
   * than failing as an unresolved module.
   */
  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    model: string,
  ): Promise<{ text: string; usage?: AssistantUsage }> {
    let Anthropic: new (opts: Record<string, unknown>) => {
      messages: { create: (body: Record<string, unknown>) => Promise<unknown> };
    };
    // The specifier is a VARIABLE on purpose: it keeps the SDK out of the build
    // graph entirely, the same way `HermesAgentAdapter` keeps Hermes out. A literal
    // here would make the package fail to typecheck wherever the SDK is absent —
    // which is every install that has not opted into Claude.
    const moduleName = '@anthropic-ai/sdk';
    try {
      const mod = (await import(moduleName)) as { default?: unknown };
      Anthropic = (mod.default ?? mod) as typeof Anthropic;
    } catch {
      throw new LlmEgressConfigurationError(
        "The Anthropic SDK is not installed. Run: npm install @anthropic-ai/sdk (it is an optional peer of agent-runtime — the package builds without it).",
      );
    }

    const client = new Anthropic({ apiKey, timeout: this.timeoutMs });
    const response = (await client.messages.create({
      model,
      max_tokens: this.maxTokens,
      // Adaptive thinking: planning which governed skill answers an intent is
      // exactly the kind of decision worth thinking about, and the model paces it.
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })) as {
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    // A refusal is a 200 with `stop_reason: "refusal"` — check it before reading content.
    if (response.stop_reason === 'refusal') {
      throw new LlmEgressError('Claude declined this request (stop_reason: refusal).');
    }
    const text = (response.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('')
      .trim();
    if (!text) {
      throw new LlmEgressError('Claude returned no text block to parse a proposal from.');
    }
    return {
      text,
      usage: {
        provider: 'claude',
        // The model that ANSWERED. It can differ from the one requested (an alias,
        // or a server-side fallback), and an invoice is settled against what ran.
        model: response.model ?? model,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }
}
