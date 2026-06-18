import { Injectable } from '@nestjs/common';

interface Prompt {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
}

const PROMPTS: Prompt[] = [
  {
    name: 'evolith/validate-repository',
    description: 'Template for validating a repository against Evolith governance rules',
    arguments: [
      { name: 'path', description: 'Path to the repository to validate', required: true },
      { name: 'ruleset', description: 'Specific ruleset to focus on (optional)', required: false },
    ],
  },
  {
    name: 'evolith/agent-onboarding',
    description: 'Template for installing and configuring a new Evolith agent',
    arguments: [
      { name: 'name', description: 'Name of the agent to create', required: true },
      { name: 'template', description: 'Template to use: standard, minimal, enterprise', required: false },
    ],
  },
  {
    name: 'evolith/review-architecture',
    description: 'Template for performing F1/F2/F3 architecture validation review',
    arguments: [
      { name: 'path', description: 'Path to the repository', required: true },
      { name: 'level', description: 'Architecture level: F1, F2, or F3', required: false },
    ],
  },
  {
    name: 'evolith/prepare-discovery',
    description: 'Template for preparing the discovery phase artifacts',
    arguments: [{ name: 'path', description: 'Path to the repository', required: true }],
  },
  {
    name: 'evolith/phase-gate-check',
    description: 'Template for checking phase gate readiness',
    arguments: [{ name: 'path', description: 'Path to the repository', required: true }],
  },
  {
    name: 'evolith/sdlc-handoff',
    description: 'Template for executing SDLC phase handoff',
    arguments: [
      { name: 'path', description: 'Path to the repository', required: true },
      { name: 'fromPhase', description: 'Source phase', required: true },
      { name: 'toPhase', description: 'Target phase', required: true },
    ],
  },
  {
    name: 'evolith/ruleset-analysis',
    description: 'Template for analyzing a ruleset for compliance',
    arguments: [
      { name: 'ruleset', description: 'Ruleset ID to analyze', required: true },
      { name: 'path', description: 'Path to the repository', required: false },
    ],
  },
  {
    name: 'evolith/moscow-prioritization',
    description: 'Template for creating MoSCoW prioritization matrix for SDLC discovery phase',
    arguments: [
      { name: 'path', description: 'Path to the repository', required: true },
      { name: 'phase', description: 'Phase to prioritize (default: phase-0)', required: false },
    ],
  },
];

type Args = Record<string, string>;

/** Serves MCP prompts (`prompts/list`, `prompts/get`) as reusable templates. */
@Injectable()
export class PromptsService {
  list(): { prompts: Prompt[] } {
    return { prompts: PROMPTS };
  }

  get(name: string, args: Args = {}): { messages: Array<{ role: string; content: { type: string; text: string } }> } {
    const prompt = PROMPTS.find((p) => p.name === name);
    if (!prompt) throw new Error(`Unknown prompt: ${name}`);
    return {
      messages: [{ role: 'user', content: { type: 'text', text: BUILDERS[name](args) } }],
    };
  }
}

const BUILDERS: Record<string, (args: Args) => string> = {
  'evolith/validate-repository': (args) =>
    `Please validate the repository at "${args.path || '<path>'}" against Evolith governance rules.\n\nUse the evolith-validate tool to check:\n- GOV-01: evolith.yaml exists\n- GOV-02: governance.version declared\n- INH-02: coreRef.version is pinned\n- ACL-01: ACL directory is not empty\n- OCB-01: No enterprise-only licenses in Core\n\n${args.ruleset ? `Focus specifically on the "${args.ruleset}" ruleset.` : ''}\n\nReport any blocking issues that must be resolved before the repository can be considered compliant.`,
  'evolith/agent-onboarding': (args) =>
    `Please help onboard a new Evolith agent.\n\nAgent name: ${args.name || '<name>'}\nTemplate: ${args.template || 'standard'}\n\nUse the evolith-agent-install tool to create the agent with the appropriate ruleset template.\n\nThen use evolith-agent-validate to verify the agent is properly configured.`,
  'evolith/review-architecture': (args) =>
    `Please perform an architecture review for the repository at "${args.path || '<path>'}".\n\nUse the evolith-architecture-validate tool to check F1 (modular independence), F2 (contract boundaries) and F3 (extraction readiness).\n\n${args.level ? `Focus on ${args.level} level only.` : 'Check all three levels.'}`,
  'evolith/prepare-discovery': (args) =>
    `Please prepare the discovery phase artifacts for the repository at "${args.path || '<path>'}".\n\nUse evolith-sdlc-status to check readiness, then evolith-moscow-create to draft a prioritization matrix for phase-0.`,
  'evolith/phase-gate-check': (args) =>
    `Please check the phase gate status for the repository at "${args.path || '<path>'}".\n\nUse evolith-sdlc-status to retrieve the current phase and the requirements for each gate, then provide a checklist of remaining items.`,
  'evolith/sdlc-handoff': (args) =>
    `Please execute the SDLC phase handoff from "${args.fromPhase || '<from>'}" to "${args.toPhase || '<to>'}" for the repository at "${args.path || '<path>'}".\n\nUse the evolith-sdlc-handoff tool to verify requirements, generate the handoff manifest, and validate readiness.`,
  'evolith/ruleset-analysis': (args) =>
    `Please analyze the "${args.ruleset || '<ruleset>'}" ruleset for compliance.\n\nUse evolith-validate with ruleset="${args.ruleset}" to retrieve the ruleset definition.${args.path ? ` Validate against repository at "${args.path}".` : ''}`,
  'evolith/moscow-prioritization': (args) =>
    `Please create a MoSCoW prioritization matrix for the SDLC discovery phase.\n\nRepository: ${args.path || '<path>'}\nPhase: ${args.phase || 'phase-0'}\n\nUse evolith-moscow-create to categorize items as MUST/SHOULD/COULD/WONT, then evolith-moscow-validate to ensure the prioritization is well-formed.`,
};
