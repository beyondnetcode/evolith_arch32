/**
 * Registry of assistant transports — ADR-0128.
 *
 * The Core publishes WHICH providers it can speak to; the tenant chooses one and
 * supplies its own credential. This file is the published half: a name → factory
 * map, so adding a provider is one class and one entry, with no change to the
 * engine, the approval gate, or the egress controls.
 *
 * WHY A REGISTRY RATHER THAN A SWITCH. A switch statement in the factory would
 * make the set of providers a property of the runtime's wiring code, invisible to
 * anything that wants to ASK. The catalog has to be answerable — a tenant picking
 * a provider needs the list, and so does any surface that offers the choice.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: pick a default. There is none. An install
 * that names no provider gets the deterministic stub, no network and no cost —
 * which is what keeps Evolith Core free to run (ADR-0128 §3).
 */

import type {
  IAssistantTransport,
  AssistantInvocationRequest,
  AssistantProposal,
} from '../domain/ports/assistant-invocation.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { ILlmEgressAudit } from './llm-egress';
import { LlmEgressConfigurationError } from './llm-egress';
import { GeminiProvider } from './GeminiProvider';
import { ClaudeProvider } from './ClaudeProvider';

/** What every transport factory may be given. Vendor-specific knobs come from env. */
export interface AssistantTransportOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly enabled?: boolean;
  readonly approval?: IApprovalPort;
  readonly audit?: ILlmEgressAudit;
}

export interface AssistantProviderDescriptor {
  /** The value an install or tenant selects. */
  readonly id: string;
  /** Human-facing name, for a surface that offers the choice. */
  readonly label: string;
  /**
   * Environment variables this provider reads for its credential, in order.
   * Published so a configuration surface can say what is missing WITHOUT the
   * Core ever holding the value.
   */
  readonly credentialEnvVars: readonly string[];
  readonly create: (options: AssistantTransportOptions) => IAssistantTransport;
}

/**
 * The catalog. Ordered by nothing in particular — order is not precedence, since
 * there is no default and the choice is always explicit.
 */
export const ASSISTANT_PROVIDERS: readonly AssistantProviderDescriptor[] = [
  {
    id: 'claude',
    label: 'Anthropic Claude',
    credentialEnvVars: ['ANTHROPIC_API_KEY', 'EVOLITH_LLM_API_KEY'],
    create: (o) => new ClaudeProvider(o),
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    credentialEnvVars: ['EVOLITH_LLM_API_KEY', 'GEMINI_API_KEY'],
    create: (o) => new GeminiProvider(o),
  },
];

/** The provider ids this build can serve. This is the catalog ADR-0128 says the Core publishes. */
export function listAssistantProviders(): readonly AssistantProviderDescriptor[] {
  return ASSISTANT_PROVIDERS;
}

/**
 * Resolve a transport by id.
 *
 * Returns `undefined` for an unknown id rather than throwing, so a caller can
 * tell "this install does not support that provider" (a configuration answer)
 * apart from "the provider failed" (a runtime one). The unknown-id message is
 * built by the caller, which knows whether it is reading a tenant's choice or an
 * operator's env var.
 */
export function createAssistantTransport(
  id: string,
  options: AssistantTransportOptions = {},
): IAssistantTransport | undefined {
  const descriptor = ASSISTANT_PROVIDERS.find((p) => p.id === id.trim().toLowerCase());
  return descriptor?.create(options);
}

/**
 * A transport that resolves WHICH provider to use from the request itself
 * (ADR-0128 §2, phase 2).
 *
 * This is what makes the choice per-tenant rather than per-installation. It
 * implements `IAssistantTransport`, so it drops into `SupervisedAssistantClient`
 * where a concrete provider used to go: the HITL gate, the egress controls and
 * the engine are all unchanged and unaware. What changes is only that the
 * provider is now late-bound.
 *
 * Transports are memoised per provider id. Not for speed — for identity: a fresh
 * transport per call would re-read environment credentials on every request and
 * make the audit trail describe objects that no longer exist. The tenant's own
 * credential is NOT part of the key, and must not be: it travels in the request
 * and is used per call, never captured in a cached instance.
 */
export class TenantSelectableAssistantTransport implements IAssistantTransport {
  private readonly cache = new Map<string, IAssistantTransport>();

  constructor(
    private readonly options: AssistantTransportOptions = {},
    /**
     * Used when a request carries no selection — a single-tenant install keeps
     * working exactly as it did in phase 1. Absent means an unselecting request
     * is refused, which is the correct answer when nothing was configured.
     */
    private readonly fallbackProvider?: string,
  ) {}

  async invoke(request: AssistantInvocationRequest): Promise<AssistantProposal> {
    const requested = request.providerSelection?.provider ?? this.fallbackProvider;
    if (!requested) {
      throw new LlmEgressConfigurationError(
        'No assistant provider selected for this request and none configured for this installation. ' +
          `This build serves: ${ASSISTANT_PROVIDERS.map((p) => p.id).join(', ')}.`,
      );
    }
    const id = requested.trim().toLowerCase();
    let transport = this.cache.get(id);
    if (!transport) {
      transport = createAssistantTransport(id, this.options);
      if (!transport) {
        // A tenant naming a provider this build cannot serve is a CONFIGURATION
        // answer, and must read as one. "Your provider is not supported here" is
        // actionable; "the assistant is broken" is what the user would otherwise
        // conclude, and it would be false.
        throw new LlmEgressConfigurationError(
          `Provider '${id}' is not supported by this Evolith Core build. Available: ` +
            `${ASSISTANT_PROVIDERS.map((p) => p.id).join(', ')}.`,
        );
      }
      this.cache.set(id, transport);
    }
    return transport.invoke(request);
  }
}
