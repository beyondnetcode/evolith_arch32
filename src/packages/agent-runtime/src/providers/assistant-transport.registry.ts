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

import type { IAssistantTransport } from '../domain/ports/assistant-invocation.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { ILlmEgressAudit } from './llm-egress';
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
