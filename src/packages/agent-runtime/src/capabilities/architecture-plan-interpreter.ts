import { ILLMProvider } from '../providers/ILLMProvider';

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

    const parsedPlan = await this.llmProvider.generateStructuredJson(systemPrompt, prompt);
    
    // Ensure the prompt_source is faithfully recorded
    parsedPlan.prompt_source = prompt;
    
    return parsedPlan;
  }
}
