import type { JsonSchemaNode } from './llm-egress';

/**
 * @deprecated GT-575 — legacy, ungoverned-by-design seam.
 *
 * This port predates {@link IAssistantTransport} and duplicates it. The governed
 * path to an LLM is:
 *
 *     request → SupervisedAssistantClient (feature flag + HITL approval)
 *             → IAssistantTransport (e.g. GeminiProvider)
 *             → bounded catalog + policy + trace
 *
 * `ILLMProvider` has no catalog bound and declares no HITL gate of its own; it
 * survives only because it is part of the published 1.x contract
 * (`ArchitecturePlanInterpreter` and the CLI `plan create` command consume it).
 *
 * COLLAPSED (GT-575): no shipped class implements this port any more.
 * `GeminiProvider` is an `IAssistantTransport`; it merely keeps a
 * `generateStructuredJson` METHOD so the frozen 1.x consumers still type-check,
 * and that method now runs through the identical governed core (off by default,
 * header auth, timeout, budget, redaction, schema validation, audit) AND the
 * identical supervision gate — it refuses to open a socket unless an
 * `IApprovalPort` was injected into the provider and grants. So this is no
 * longer a second, ungoverned way to reach an LLM; there is exactly one, and
 * new code MUST express it as `IAssistantTransport` behind the supervised
 * client.
 *
 * Removal is a SemVer major; see the package README's contract-stability policy.
 */
export interface ILLMProvider {
  /**
   * Generates a structured JSON response from the LLM based on the system prompt and input.
   *
   * @param systemPrompt Instructions defining the schema and behavior.
   * @param userPrompt The actual requirement to process.
   * @param schema Declared shape the answer is VALIDATED against (GT-575).
   *   Implementations must reject an off-schema answer rather than cast it.
   * @returns A parsed, schema-validated JSON object.
   */
  generateStructuredJson<T = any>(
    systemPrompt: string,
    userPrompt: string,
    schema?: JsonSchemaNode,
  ): Promise<T>;
}
