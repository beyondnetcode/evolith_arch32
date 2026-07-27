import type { ILLMProvider } from '../providers/ILLMProvider';
import type { JsonSchemaNode } from '../providers/llm-egress';

/**
 * The Architecture Plan contract, DECLARED so the model's answer is validated
 * instead of cast (GT-575). Only the fields the caller actually relies on are
 * required; extra keys from the model are tolerated.
 */
export const ARCHITECTURE_PLAN_SCHEMA: JsonSchemaNode = {
  type: 'object',
  required: ['title', 'scope', 'impact', 'risk_assessment', 'execution_plan'],
  properties: {
    title: { type: 'string', minLength: 1 },
    prompt_source: { type: 'string' },
    scope: {
      type: 'object',
      required: ['functional', 'technical'],
      properties: { functional: { type: 'string' }, technical: { type: 'string' } },
    },
    impact: {
      type: 'object',
      required: ['components', 'interfaces'],
      properties: {
        components: { type: 'array', items: { type: 'string' } },
        interfaces: { type: 'array', items: { type: 'string' } },
      },
    },
    risk_assessment: {
      type: 'object',
      required: ['criticality', 'complexity'],
      properties: {
        criticality: { type: 'string', enum: ['low', 'medium', 'high'] },
        complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
        security_risks: { type: 'array', items: { type: 'string' } },
        architectural_risks: { type: 'array', items: { type: 'string' } },
      },
    },
    execution_plan: {
      type: 'object',
      required: ['suggested_sdlc_phases', 'mandatory_gates'],
      properties: {
        suggested_sdlc_phases: { type: 'array', items: { type: 'string' } },
        mandatory_gates: { type: 'array', items: { type: 'string' } },
        suggested_adrs: { type: 'array', items: { type: 'string' } },
        applicable_policies: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

/**
 * Turns a raw requirement into a schema-validated Architecture Plan.
 *
 * GT-575 — the provider it is handed must be SUPERVISED. The shipped
 * `GeminiProvider` satisfies this shape but refuses to open a socket unless it
 * was given an `IApprovalPort` (`new GeminiProvider({ approval })`), so passing
 * a bare provider here fails closed with `LlmEgressUnsupervisedError` instead of
 * contacting Google unsupervised. There is no ungoverned path left through this
 * class.
 */
export class ArchitecturePlanInterpreter {
  constructor(private readonly llmProvider: ILLMProvider) {}

  async interpret(prompt: string): Promise<any> {
    const systemPrompt = `You are an expert Software Architect for Evolith Core.
Your task is to translate raw business requirements into a structured JSON Architecture Plan.
The JSON must have the following schema:
{
  "title": "string",
  "prompt_source": "string",
  "scope": { "functional": "string", "technical": "string" },
  "impact": { "components": ["string"], "interfaces": ["string"] },
  "risk_assessment": {
    "criticality": "low" | "medium" | "high",
    "complexity": "low" | "medium" | "high",
    "security_risks": ["string"],
    "architectural_risks": ["string"]
  },
  "execution_plan": {
    "suggested_sdlc_phases": ["string"],
    "mandatory_gates": ["string"],
    "suggested_adrs": ["string"],
    "applicable_policies": ["string"]
  }
}
Keep descriptions concise but highly technical and accurate. Identify relevant architectural and security risks if the prompt implies them (e.g. auth, payments, external API).`;

    // GT-575: the answer is validated against the declared contract; an
    // off-schema plan throws rather than being written to disk as if valid.
    const parsedPlan = await this.llmProvider.generateStructuredJson(
      systemPrompt,
      prompt,
      ARCHITECTURE_PLAN_SCHEMA,
    );

    // Ensure the prompt_source is faithfully recorded
    parsedPlan.prompt_source = prompt;

    return parsedPlan;
  }
}
