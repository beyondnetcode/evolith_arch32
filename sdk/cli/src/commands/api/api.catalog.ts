export interface ApiCategory {
  name: string;
  label: string;
  description: string;
}

export interface ApiEntry {
  name: string;
  description: string;
}

export interface ApiResource {
  uri: string;
  name: string;
  description: string;
}

export interface ToolSchema {
  description: string;
  inputSchema: object;
  outputSchema: object;
}

export interface ResourceSchema {
  description: string;
  mimeType: string;
}

export interface CommandSchema {
  description: string;
  options: Array<{ flags: string; description: string }>;
}

export const CATEGORIES: ApiCategory[] = [
  { name: 'tools', label: 'MCP Tools', description: '23 available operations' },
  { name: 'resources', label: 'MCP Resources', description: '8 available resources' },
  { name: 'schemas', label: 'Phase-Gate Schemas', description: '18 validation schemas' },
  { name: 'commands', label: 'CLI Commands', description: '21 native commands' },
];

export const TOOLS: ApiEntry[] = [
  { name: 'agent-create', description: 'Create a new agent configuration' },
  { name: 'agent-list', description: 'List all configured agents' },
  { name: 'agent-validate', description: 'Validate agent configuration' },
  { name: 'architecture-drift', description: 'Detect architecture pattern drift' },
  { name: 'architecture-scaffold', description: 'Scaffold architecture patterns' },
  { name: 'gate-evaluate', description: 'Evaluate phase gate compliance' },
  { name: 'gate-status', description: 'Get current gate status for project' },
  { name: 'moscow-analyze', description: 'Run MoSCoW prioritization analysis' },
  { name: 'moscow-export', description: 'Export MoSCoW analysis results' },
  { name: 'sdlc-phase', description: 'Get current SDLC phase' },
  { name: 'sdlc-advance', description: 'Advance to next SDLC phase' },
  { name: 'validate-artifacts', description: 'Validate project artifacts' },
  { name: 'validate-structure', description: 'Validate project structure' },
  { name: 'phase-advance-propose', description: 'Propose phase advancement' },
  { name: 'phase-advance-execute', description: 'Execute phase advancement' },
];

export const RESOURCES: ApiResource[] = [
  { uri: 'evolith://rulesets', name: 'Rulesets', description: 'List of all available rulesets' },
  { uri: 'evolith://phase-gates', name: 'Phase Gates', description: 'Phase gate definitions' },
  { uri: 'evolith://agents', name: 'Agents', description: 'List of installed Evolith agents' },
  { uri: 'evolith://core/info', name: 'Core Info', description: 'General Evolith Core information' },
  { uri: 'evolith://governance/version', name: 'Governance Version', description: 'Current governance schema version' },
  { uri: 'evolith://core/version', name: 'Core Version', description: 'Current Core schema version' },
  { uri: 'evolith://repository/config', name: 'Repository Config', description: 'Repository evolith.yaml content' },
  { uri: 'evolith://moscow/phase-0', name: 'MoSCoW Phase 0', description: 'MoSCoW prioritization matrix' },
];

export const SCHEMAS: ApiEntry[] = [
  { name: 'gate-evidence', description: 'Schema for gate evaluation evidence' },
  { name: 'phase-transition', description: 'Schema for phase transition requests' },
  { name: 'adr-record', description: 'Schema for Architecture Decision Records' },
  { name: 'ruleset-schema', description: 'Base schema for ruleset definitions' },
  { name: 'acl-schema', description: 'Anti-Corruption Layer validation schema' },
  { name: 'build-vs-compose', description: 'Build vs Compose evidence validation' },
  { name: 'moscow-matrix', description: 'MoSCoW prioritization matrix schema' },
  { name: 'agent-config', description: 'Agent configuration schema' },
];

export const COMMANDS: ApiEntry[] = [
  { name: 'init', description: 'Initialize new Evolith project' },
  { name: 'validate', description: 'Validate project against governance' },
  { name: 'gate', description: 'Phase gate evaluation and status' },
  { name: 'sdlc', description: 'SDLC phase management' },
  { name: 'adr', description: 'ADR registry and management' },
  { name: 'docs', description: 'Documentation scaffolding' },
  { name: 'scaffold', description: 'Architecture pattern scaffolding' },
  { name: 'drift', description: 'Architecture drift detection' },
  { name: 'completion', description: 'Shell completion and hooks' },
  { name: 'fixtures', description: 'Generate test fixtures' },
  { name: 'history', description: 'Project history and DORA metrics' },
  { name: 'profile', description: 'CLI configuration profiles' },
  { name: 'upgrade', description: 'Upgrade Evolith project' },
  { name: 'api', description: 'Browse API surface (this command)' },
];

export const TOOL_SCHEMAS: Record<string, ToolSchema> = {
  'gate-evaluate': {
    description: 'Evaluate phase gate compliance for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string', description: 'Path to project root' },
        phase: { type: 'string', enum: ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5'] },
        strict: { type: 'boolean', description: 'Fail on warnings vs errors', default: false },
      },
      required: ['projectPath', 'phase'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        passed: { type: 'boolean' },
        gateId: { type: 'string' },
        phase: { type: 'string' },
        evidenceResults: { type: 'array' },
        blockingChecks: { type: 'array' },
      },
    },
  },
  'validate-artifacts': {
    description: 'Validate that required project artifacts exist',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        artifactPattern: { type: 'string', description: 'Glob pattern for artifacts' },
      },
      required: ['projectPath'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        missing: { type: 'array', items: { type: 'string' } },
        found: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  'agent-create': {
    description: 'Create a new agent configuration in rulesets/agents/',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name (kebab-case)' },
        type: { type: 'string', enum: ['coding', 'review', 'security', 'architecture'] },
        capabilities: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'type'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        created: { type: 'boolean' },
        path: { type: 'string' },
        agentConfig: { type: 'object' },
      },
    },
  },
};

export const RESOURCE_SCHEMAS: Record<string, ResourceSchema> = {
  'evolith://rulesets': {
    description: 'List of all available rulesets in Evolith Core',
    mimeType: 'application/json',
  },
  'evolith://phase-gates': {
    description: 'Phase gate definitions and requirements',
    mimeType: 'application/json',
  },
  'evolith://core/info': {
    description: 'General information about the Evolith Core',
    mimeType: 'application/json',
  },
};

export const COMMAND_SCHEMAS: Record<string, CommandSchema> = {
  'init': {
    description: 'Initialize a new Evolith project',
    options: [
      { flags: '-n, --name <name>', description: 'Project name' },
      { flags: '-t, --type <type>', description: 'Project type (library, app, api)' },
      { flags: '-r, --runtime <runtime>', description: 'Runtime (nodejs, dotnet, python)' },
      { flags: '--dry-run', description: 'Show what would be created' },
    ],
  },
  'validate': {
    description: 'Validate project against governance rules',
    options: [
      { flags: '--ruleset <name>', description: 'Specific ruleset to validate against' },
      { flags: '--strict', description: 'Fail on warnings' },
      { flags: '--report', description: 'Output validation report' },
    ],
  },
  'gate': {
    description: 'Phase gate evaluation and status commands',
    options: [
      { flags: 'evaluate', description: 'Evaluate gate compliance' },
      { flags: 'status', description: 'Show current gate status' },
      { flags: '--phase <phase>', description: 'Specific phase to evaluate' },
    ],
  },
};
