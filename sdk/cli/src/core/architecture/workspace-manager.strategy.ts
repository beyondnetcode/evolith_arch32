export interface WorkspaceManagerStrategy {
  setDryRun?(dryRun: boolean): void;
  installDependencies(frontendFramework: string, orm: string): Promise<void>;
  generateStandardWebApp(name: string, framework: string): Promise<void>;
  generateHostApp(name: string, remotes: string[], framework: string): Promise<void>;
  generateApiApp(name: string): Promise<void>;
  generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void>;
}
