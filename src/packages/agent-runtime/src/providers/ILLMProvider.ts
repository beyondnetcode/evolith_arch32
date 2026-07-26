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
 * `ILLMProvider` has no HITL gate and no catalog bound; it survives only because
 * it is part of the published 1.x contract (`ArchitecturePlanInterpreter` and the
 * CLI `plan create` command consume it). Its only shipped implementation,
 * `GeminiProvider`, now routes BOTH seams through the same governed egress core
 * (off by default, header auth, timeout, budget, redaction, schema validation,
 * audit), so this is no longer a bypass — but new code MUST use
 * `IAssistantTransport` behind the supervised client.
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
