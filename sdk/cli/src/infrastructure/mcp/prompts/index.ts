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
    arguments: [
      { name: 'path', description: 'Path to the repository', required: true },
    ],
  },
  {
    name: 'evolith/phase-gate-check',
    description: 'Template for checking phase gate readiness',
    arguments: [
      { name: 'path', description: 'Path to the repository', required: true },
    ],
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

export async function listPrompts() {
  return { prompts: PROMPTS };
}

export async function getPrompt(args: unknown) {
  const { name, arguments: promptArgs = {} } = args as { name: string; arguments?: Record<string, string> };

  const prompt = PROMPTS.find(p => p.name === name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }

  let template = '';

  switch (name) {
    case 'evolith/validate-repository':
      template = buildValidatePrompt(promptArgs);
      break;
    case 'evolith/agent-onboarding':
      template = buildAgentOnboardingPrompt(promptArgs);
      break;
    case 'evolith/review-architecture':
      template = buildArchitectureReviewPrompt(promptArgs);
      break;
    case 'evolith/prepare-discovery':
      template = buildPrepareDiscoveryPrompt(promptArgs);
      break;
    case 'evolith/phase-gate-check':
      template = buildPhaseGateCheckPrompt(promptArgs);
      break;
    case 'evolith/sdlc-handoff':
      template = buildSdlcHandoffPrompt(promptArgs);
      break;
    case 'evolith/ruleset-analysis':
      template = buildRulesetAnalysisPrompt(promptArgs);
      break;
    case 'evolith/moscow-prioritization':
      template = buildMoscowwPrioritizationPrompt(promptArgs);
      break;
  }

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: template,
        },
      },
    ],
  };
}

function buildValidatePrompt(args: Record<string, string>): string {
  return `Please validate the repository at "${args.path || '<path>'}" against Evolith governance rules.

Use the evolith-validate tool to check:
- GOV-01: evolith.yaml exists
- GOV-02: governance.version declared
- INH-02: coreRef.version is pinned
- ACL-01: ACL directory is not empty
- OCB-01: No enterprise-only licenses in Core

${args.ruleset ? `Focus specifically on the "${args.ruleset}" ruleset.` : ''}

Report any blocking issues that must be resolved before the repository can be considered compliant.`;
}

function buildAgentOnboardingPrompt(args: Record<string, string>): string {
  return `Please help onboard a new Evolith agent.

Agent name: ${args.name || '<name>'}
Template: ${args.template || 'standard'}

Use the evolith-agent-install tool to create the agent with the appropriate ruleset template.

Then use evolith-agent-validate to verify the agent is properly configured.

Finally, provide a summary of the agent's governance principles and any next steps for configuration.`;
}

function buildArchitectureReviewPrompt(args: Record<string, string>): string {
  return `Please perform an architecture review for the repository at "${args.path || '<path>'}".

Use the evolith-architecture-validate tool to check:

F1 (Modular Independence):
- F1-01: Monorepo workspace detection
- F1-02: Multiple bounded contexts present

F2 (Contract Boundaries):
- F2-01: No circular dependencies between modules

F3 (Extraction Readiness):
- F3-01: Product type declared
- F3-02: Dockerfile exists for containerization

${args.level ? `Focus on ${args.level} level only.` : 'Check all three levels.'}

Provide a detailed report of any architectural issues found.`;
}

function buildPrepareDiscoveryPrompt(args: Record<string, string>): string {
  return `Please prepare the discovery phase artifacts for the repository at "${args.path || '<path>'}".

Use the evolith-sdlc-status tool to check the current readiness.
Then use evolith-moscow-create to draft a prioritization matrix for phase-0.

Identify missing inputs from the user before proceeding to the design phase.`;
}

function buildPhaseGateCheckPrompt(args: Record<string, string>): string {
  return `Please check the phase gate status for the repository at "${args.path || '<path>'}".

Use the evolith-sdlc-status tool to retrieve the current phase and requirements for each phase gate.

Identify which phase the repository is currently in and what requirements must be met to advance to the next phase.

Provide a clear checklist of remaining items to complete before advancing.`;
}

function buildSdlcHandoffPrompt(args: Record<string, string>): string {
  return `Please execute the SDLC phase handoff from "${args.fromPhase || '<from>'}" to "${args.toPhase || '<to>'}" for the repository at "${args.path || '<path>'}".

Use the evolith-sdlc-handoff tool to:
1. Verify all requirements for ${args.fromPhase || '<from>'} are met
2. Generate the handoff manifest
3. Validate readiness for ${args.toPhase || '<to>'}

Report the handoff manifest contents and any recommendations for the next phase.`;
}

function buildRulesetAnalysisPrompt(args: Record<string, string>): string {
  return `Please analyze the "${args.ruleset || '<ruleset>'}" ruleset for compliance.

Use the evolith-validate tool with ruleset="${args.ruleset}" to retrieve the ruleset definition.

${args.path ? `Validate against repository at "${args.path}".` : ''}

For each rule in the ruleset:
1. Identify the rule ID and severity (MUST/SHOULD/COULD)
2. Explain the governance intent
3. Provide examples of compliance and non-compliance
4. Suggest validation approaches`;
}

function buildMoscowwPrioritizationPrompt(args: Record<string, string>): string {
  return `Please create a MoSCoW prioritization matrix for the SDLC discovery phase.

Repository: ${args.path || '<path>'}
Phase: ${args.phase || 'phase-0'}

Use the evolith-moscow-create tool to create the analysis with items categorized as:

**MUST** - Non-negotiable requirements for phase success
**SHOULD** - Important but not critical; can be deferred if necessary
**COULD** - Desirable but not necessary; nice-to-have improvements
**WONT** - Explicitly excluded from this phase (but may be considered later)

For each item, provide:
- description: Clear statement of the requirement
- category: Functional area (e.g., "Governance", "Architecture", "Documentation")
- rationale: Why this item has this priority level

Best practices:
- Keep MUST items under 60% of total items
- Every initiative should have at least one MUST item
- WONT items should be explicitly documented to avoid scope creep

After creating the analysis, use evolith-moscow-validate to ensure the prioritization is well-formed.`;
}