export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PlatformCheck {
  name: string;
  command: string;
  available: boolean;
  version?: string;
  installHint?: string;
}

export interface ICommandExecutor {
  execute(command: string, cwd?: string): Promise<CommandResult>;
  checkTool(name: string, versionCommand: string): Promise<PlatformCheck>;
}

export interface ICatalogLoader {
  loadRuntimeCatalog(): Runtime[];
  loadToolCatalog(): ToolCatalog;
  loadCommandsMatrix(): CommandsMatrix;
  getMonorepoOptions(): MonorepoOption[];
  getArchitecturePatterns(): ArchitecturePattern[];
  getDefaultDatabase(runtimeId: string): string;
  getApiProtocols(): Array<{ id: string; name: string; description: string }>;
}

export interface Runtime {
  id: string;
  name: string;
  versions: string[];
  defaultVersion: string;
  language: string;
  typeSystem: string;
  frameworks: Framework[];
  databases: Database[];
  buildTools: string[];
  testFrameworks: string[];
  packageManager: string;
}

export interface Framework {
  id: string;
  name: string;
  version: string;
}

export interface Database {
  id: string;
  name: string;
  orm?: string;
  type?: string;
}

export interface MonorepoOption {
  id: string;
  name: string;
  description: string;
  defaults: {
    structure: string;
    ciStrategy: string;
    libraryStructure?: string;
    policyEnforcement?: boolean;
  };
}

export interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  layers: string[];
  dddConcepts?: string[];
}

export interface ToolGroup {
  question: string;
  defaultOption: string;
  options?: ToolOption[];
  tools: string[];
}

export interface ToolOption {
  value: string;
  label: string;
  description: string;
  hint?: string;
}

export interface PhaseDefinition {
  value: string;
  label: string;
  description: string;
  gateChecks: GateCheck[];
  artifacts: string[];
  toolGroups: Record<string, ToolGroup>;
  defaultTools: string[];
}

export interface GateCheck {
  id: string;
  description: string;
  required: boolean;
}

export interface PlatformCheck {
  name: string;
  command: string;
  available: boolean;
  version?: string;
  installHint?: string;
}

export interface ProjectConfig {
  name: string;
  runtime: Runtime;
  monorepo: MonorepoOption;
  architecture: ArchitecturePattern;
  database: string;
  apiProtocol: string;
  ciCd: string;
  observability: string;
}

export interface PhaseTransition {
  fromPhase: string;
  toPhase: string;
  tools: string[];
  validated: boolean;
  timestamp: string;
}

export interface ICommandExecutor {
  execute(command: string, cwd?: string): Promise<CommandResult>;
  checkTool(name: string, versionCommand: string): Promise<PlatformCheck>;
}

export interface ICatalogLoader {
  loadRuntimeCatalog(): Runtime[];
  loadToolCatalog(): ToolCatalog;
  loadCommandsMatrix(): CommandsMatrix;
  getMonorepoOptions(): MonorepoOption[];
  getArchitecturePatterns(): ArchitecturePattern[];
  getDefaultDatabase(runtimeId: string): string;
  getApiProtocols(): Array<{ id: string; name: string; description: string }>;
}

export interface ToolCatalog {
  phases: Record<string, PhaseDefinition>;
  toolMetadata: Record<string, ToolMetadata>;
}

export interface ToolMetadata {
  description: string;
  runtimeAgnostic: boolean;
  runtimeAware?: boolean;
  phase: string;
  commands?: string[];
  platformCheck?: string;
}

export interface CommandsMatrix {
  runtimes: Record<string, RuntimeCommands>;
  monorepos: Record<string, MonorepoCommands>;
  container: ContainerCommands;
  observability: ObservabilityCommands;
}

export interface RuntimeCommands {
  native: string[];
  scaffold: string[];
  delegated: string[];
  unsupported: string[];
}

export interface MonorepoCommands {
  native: string[];
  delegated: string[];
}

export interface ContainerCommands {
  delegated: string[];
  unsupported: string[];
}

export interface ObservabilityCommands {
  scaffold: string[];
  delegated: string[];
}

export interface IFileSystem {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readJson<T>(path: string): Promise<T>;
  writeJson(path: string, data: unknown): Promise<void>;
  ensureDir(path: string): Promise<void>;
  readdirNames(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
}

export interface IConfigParser {
  parse(content: string): unknown;
  stringify(data: unknown): string;
}

export interface ILogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export interface IProjectInitializer {
  initialize(config: ProjectConfig, cwd: string): Promise<InitResult>;
  scaffoldRuntime(config: ProjectConfig, fs: IFileSystem, projectDir: string): Promise<void>;
}

export interface InitResult {
  success: boolean;
  artifacts: string[];
  warnings: string[];
  errors: string[];
}

export interface IPhaseGates {
  validate(phase: string, cwd: string): Promise<GateResult[]>;
  canTransition(from: string, to: string): boolean;
}

export interface GateResult {
  id: string;
  passed: boolean;
  description: string;
  error?: string;
}

export interface IToolExecutor {
  execute(tool: string, context: ToolContext): Promise<ToolResult>;
  detectPlatform(tool: string): Promise<PlatformCheck>;
}

export interface ToolContext {
  phase: string;
  projectDir: string;
  runtime?: string;
}

export interface ToolResult {
  success: boolean;
  command?: string;
  output?: string;
  error?: string;
}

export interface IToolSelector {
  getToolsForPhase(phase: string): ToolGroup[];
  getDefaultTools(phase: string): string[];
  validateToolSelection(phase: string, tools: string[]): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}