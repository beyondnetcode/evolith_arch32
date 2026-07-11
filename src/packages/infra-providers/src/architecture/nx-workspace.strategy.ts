import { WorkspaceManagerStrategy } from '@beyondnet/evolith-core-domain/application/architecture/workspace-manager.strategy';
import { ICommandExecutor } from '@beyondnet/evolith-core-domain/domain/interfaces';
import * as path from 'path';

/**
 * Frameworks that have native Nx Module Federation (host/remote) support.
 * Vue uses Vite-based MFE which Nx does not scaffold via a dedicated `:host`
 * generator — a standard app is generated and the developer configures MFE
 * manually via `@originjs/vite-plugin-federation` or similar.
 */
const MFE_CAPABLE_FRAMEWORKS = new Set(['react', 'angular']);

export interface NxWorkspaceStrategyOptions {
  /** Progress sink for human-facing step messages. Defaults to a no-op. */
  progress?: (message: string) => void;
  /**
   * Workspace root under which the `src` Nx workspace is generated. The Nx and
   * npm commands run in `<baseDir>/src`. Defaults to `process.cwd()`, matching
   * the CLI. MCP callers pass the satellite path so an agent can scaffold a
   * repo other than the server's working directory.
   */
  baseDir?: string;
}

/**
 * Nx-backed {@link WorkspaceManagerStrategy}. Relocated from the CLI to
 * `@beyondnet/evolith-infra-providers` so both the CLI (`scaffold`) and the MCP
 * gateway (`evolith-scaffold`) drive the SAME generation logic. It is decoupled
 * from any surface: progress is a plain callback (the CLI wraps it in its
 * PromptService; MCP routes it to stderr) and the target directory is injected
 * rather than read from the process cwd.
 */
export class NxWorkspaceStrategy implements WorkspaceManagerStrategy {
  /** Tracks the active frontend framework after installDependencies is called. */
  private frontendFramework = 'react';
  private dryRun = false;
  private readonly progress: (message: string) => void;
  private readonly baseDir: string;

  constructor(
    private readonly commandExecutor: ICommandExecutor,
    options: NxWorkspaceStrategyOptions = {},
  ) {
    this.progress = options.progress ?? (() => undefined);
    this.baseDir = options.baseDir ?? process.cwd();
  }

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  private getTargetDir(): string {
    return path.join(this.baseDir, 'src');
  }

  private async runNx(command: string): Promise<void> {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      this.progress(`[DRY-RUN] Would execute in ${targetDir}: npx nx ${command}`);
      return;
    }
    this.progress(`> Executing in ${targetDir}: npx nx ${command}`);
    // executeOrThrow surfaces a standard error on non-zero exit.
    await this.commandExecutor.executeOrThrow(`npx nx ${command} --no-interactive`, targetDir);
  }

  private async runNpm(command: string): Promise<void> {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      this.progress(`[DRY-RUN] Would execute in ${targetDir}: npm ${command}`);
      return;
    }
    this.progress(`> Executing in ${targetDir}: npm ${command}`);
    await this.commandExecutor.executeOrThrow(`npm ${command} --legacy-peer-deps`, targetDir);
  }

  async installDependencies(frontendFramework: string, orm: string): Promise<void> {
    const fw = frontendFramework.toLowerCase();
    this.frontendFramework = fw;

    this.progress(`Installing Nx Plugins for ${fw.toUpperCase()} and NestJS...`);
    await this.runNpm(`install -D @nx/nest @nx/${fw} @nx/webpack`);

    if (orm.toLowerCase() === 'prisma') {
      await this.runNpm(`install -D prisma @prisma/client`);
    } else if (orm.toLowerCase() === 'typeorm') {
      await this.runNpm(`install -D typeorm`);
    }
  }

  async generateStandardWebApp(name: string, framework: string): Promise<void> {
    const fw = framework.toLowerCase();
    this.frontendFramework = fw;
    this.progress(`Generating Standard Web App (Phase 1) [${name}] (${fw.toUpperCase()})...`);
    await this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
  }

  async generateHostApp(name: string, remotes: string[], framework: string): Promise<void> {
    const fw = framework.toLowerCase();
    this.frontendFramework = fw;
    this.progress(`Generating MFE Host App [${name}] with Remotes [${remotes.join(', ')}] (${fw.toUpperCase()})...`);

    if (!MFE_CAPABLE_FRAMEWORKS.has(fw)) {
      this.progress(
        `@nx/${fw} does not provide a native Module Federation :host generator. ` +
        `Generating a standard ${fw.toUpperCase()} app instead; configure MFE manually ` +
        `(e.g. @originjs/vite-plugin-federation for Vue).`,
      );
      await this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
      return;
    }

    const remotesFlag = remotes.length > 0 ? `--remotes=${remotes.join(',')}` : '';
    await this.runNx(`g @nx/${fw}:host --name=${name} ${remotesFlag} --directory=apps/${name}`);
  }

  async generateApiApp(name: string): Promise<void> {
    this.progress(`Generating NestJS API App [${name}]...`);
    await this.runNx(`g @nx/nest:app --name=${name} --directory=apps/${name}`);
  }

  async generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void> {
    this.progress(`Generating Library [${type}/${name}]...`);

    if (type === 'shared' && name.includes('ui')) {
      // UI libraries use the active frontend framework — e.g. @nx/react:library,
      // @nx/angular:library, @nx/vue:library.
      const fw = this.frontendFramework;
      this.progress(`Using @nx/${fw}:library for shared UI library.`);
      await this.runNx(`g @nx/${fw}:library --name=${name} --directory=libs/${type}/${name}`);
    } else {
      // Domain, shell and non-UI shared libs always use NestJS (backend) generator.
      await this.runNx(`g @nx/nest:library --name=${name} --directory=libs/${type}/${name}`);
    }
  }
}
