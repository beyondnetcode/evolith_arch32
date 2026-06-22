export interface InitPromptOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export const CI_CD_OPTIONS: InitPromptOption[] = [
  { value: 'github', label: 'GitHub Actions', hint: 'Primary CI/CD' },
  { value: 'gitlab', label: 'GitLab CI', hint: 'Integrated registry' },
  { value: 'azure', label: 'Azure DevOps', hint: 'Enterprise ALM' },
  { value: 'none', label: 'None', hint: 'Skip CI/CD' },
];

export const OBSERVABILITY_OPTIONS: InitPromptOption[] = [
  { value: 'otel', label: 'OpenTelemetry (All)', hint: 'Traces + Metrics + Logs' },
  { value: 'otel-traces', label: 'Traces only', hint: 'Distributed tracing' },
  { value: 'minimal', label: 'Minimal', hint: 'Basic logging' },
  { value: 'none', label: 'None', hint: 'Skip observability' },
];

export const FEATURE_OPTIONS: InitPromptOption[] = [
  { value: 'otel', label: 'OpenTelemetry', hint: 'Traces + Metrics + Logs' },
  { value: 'acl', label: 'Anti-Corruption Layer', hint: 'Schema validation' },
  { value: 'bilingual', label: 'Bilingual Docs', hint: 'EN + ES docs' },
  { value: 'hooks', label: 'Git Hooks', hint: 'Husky pre-commit' },
  { value: 'adr', label: 'ADR System', hint: 'Architecture Decisions' },
];

export const AGENT_OPTIONS: InitPromptOption[] = [
  { value: 'bmad', label: 'BMad', hint: 'Recommended' },
  { value: 'architecture', label: 'Architecture', hint: 'Recommended' },
  { value: 'qa', label: 'QA' },
  { value: 'sdlc', label: 'SDLC' },
];

export function validateProjectName(value: string): string | undefined {
  if (!value) return 'Por favor ingresa un nombre.';
  if (value.includes(' ')) return 'El nombre no debe contener espacios.';
  if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
    return 'El nombre debe empezar con letra y contener solo letras, números, guiones.';
  }
  return undefined;
}
