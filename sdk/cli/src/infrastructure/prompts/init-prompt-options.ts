export interface InitPromptOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export const MONOREPO_OPTIONS: InitPromptOption[] = [
  { value: 'none', label: 'None', hint: 'Standalone repository' },
  { value: 'nx', label: 'Nx', hint: 'Smart monorepo toolkit' },
  { value: 'npm-workspaces', label: 'npm workspaces', hint: 'Native npm workspaces' },
  { value: 'pnpm-workspaces', label: 'pnpm workspaces', hint: 'Fast, disk-efficient workspaces' },
  { value: 'rush', label: 'Rush', hint: 'Scalable monorepo solution' },
  { value: 'turborepo', label: 'Turborepo', hint: 'High-performance build system' },
  { value: 'custom', label: 'Custom', hint: 'Other monorepo strategy' },
];

export const FEATURE_OPTIONS: InitPromptOption[] = [
  { value: 'adr', label: 'ADR System', hint: 'Architecture Decision Records' },
  { value: 'hooks', label: 'Git Hooks', hint: 'Pre-commit/pre-push validation' },
  { value: 'bilingual', label: 'Bilingual Docs', hint: 'EN + ES documentation' },
  { value: 'acl', label: 'Anti-Corruption Layer', hint: 'Schema validation' },
  { value: 'otel', label: 'OpenTelemetry', hint: 'Traces + Metrics + Logs' },
];

export const AGENT_OPTIONS: InitPromptOption[] = [
  { value: 'bmad', label: 'BMad', hint: 'Recommended — governance orchestrator' },
  { value: 'architecture', label: 'Architecture', hint: 'Recommended — architecture agent' },
  { value: 'qa', label: 'QA', hint: 'Quality assurance agent' },
  { value: 'sdlc', label: 'SDLC', hint: 'SDLC lifecycle agent' },
];

export function validateProjectName(value: string | undefined): string | undefined {
  if (!value) return 'Please enter a name.';
  if (value.includes(' ')) return 'Name must not contain spaces.';
  if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
    return 'Name must start with a letter and contain only letters, numbers, hyphens.';
  }
  return undefined;
}
