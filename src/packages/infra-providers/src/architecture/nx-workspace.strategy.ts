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

/**
 * Every value interpolated into an `nx g` / `npm install` argument must be a
 * plain identifier. The commands run shell-free (argv, never a command line),
 * so this is not what stops `; rm -rf`: it is what stops `--directory=apps/../..`
 * escaping the workspace and `--name=--flag` being read as an option. Nx project
 * names are the same alphabet, so nothing legitimate is refused.
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * Validates one caller-supplied name and returns it. Throws on anything outside
 * {@link SAFE_IDENTIFIER}, naming the field so the error is actionable at the
 * CLI prompt and in the MCP envelope alike.
 */
export function assertSafeIdentifier(value: string, field: string): string {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(
      `Invalid ${field} "${value}": use letters, digits, "-" or "_" only (max 128 chars, cannot start with "-").`,
    );
  }
  return value;
}

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

  /**
   * Shell-free: `npx` receives `['nx', ...args, '--no-interactive']` as argv.
   * The progress line joins them for the human only; nothing is re-parsed.
   */
  private async runNx(args: string[]): Promise<void> {
    const targetDir = this.getTargetDir();
    const shown = `npx nx ${args.join(' ')}`;
    if (this.dryRun) {
      this.progress(`[DRY-RUN] Would execute in ${targetDir}: ${shown}`);
      return;
    }
    this.progress(`> Executing in ${targetDir}: ${shown}`);
    // executeFileOrThrow surfaces a standard error on non-zero exit.
    await this.commandExecutor.executeFileOrThrow('npx', ['nx', ...args, '--no-interactive'], targetDir);
  }

  private async runNpm(args: string[]): Promise<void> {
    const targetDir = this.getTargetDir();
    const shown = `npm ${args.join(' ')}`;
    if (this.dryRun) {
      this.progress(`[DRY-RUN] Would execute in ${targetDir}: ${shown}`);
      return;
    }
    this.progress(`> Executing in ${targetDir}: ${shown}`);
    await this.commandExecutor.executeFileOrThrow('npm', [...args, '--legacy-peer-deps'], targetDir);
  }

  async installDependencies(frontendFramework: string, orm: string): Promise<void> {
    const fw = assertSafeIdentifier(frontendFramework.toLowerCase(), 'frontend framework');
    this.frontendFramework = fw;

    this.progress(`Installing Nx Plugins for ${fw.toUpperCase()} and NestJS...`);
    await this.runNpm(['install', '-D', '@nx/nest', `@nx/${fw}`, '@nx/webpack']);

    if (orm.toLowerCase() === 'prisma') {
      await this.runNpm(['install', '-D', 'prisma', '@prisma/client']);
    } else if (orm.toLowerCase() === 'typeorm') {
      await this.runNpm(['install', '-D', 'typeorm']);
    }
  }

  async generateStandardWebApp(name: string, framework: string): Promise<void> {
    const fw = assertSafeIdentifier(framework.toLowerCase(), 'frontend framework');
    const app = assertSafeIdentifier(name, 'web app name');
    this.frontendFramework = fw;
    this.progress(`Generating Standard Web App (Phase 1) [${app}] (${fw.toUpperCase()})...`);
    await this.runNx(['g', `@nx/${fw}:app`, `--name=${app}`, `--directory=apps/${app}`]);
  }

  async generateHostApp(name: string, remotes: string[], framework: string): Promise<void> {
    const fw = assertSafeIdentifier(framework.toLowerCase(), 'frontend framework');
    const host = assertSafeIdentifier(name, 'host app name');
    const safeRemotes = remotes.map((r) => assertSafeIdentifier(r, 'remote name'));
    this.frontendFramework = fw;
    this.progress(`Generating MFE Host App [${host}] with Remotes [${safeRemotes.join(', ')}] (${fw.toUpperCase()})...`);

    if (!MFE_CAPABLE_FRAMEWORKS.has(fw)) {
      this.progress(
        `@nx/${fw} does not provide a native Module Federation :host generator. ` +
        `Generating a standard ${fw.toUpperCase()} app instead; configure MFE manually ` +
        `(e.g. @originjs/vite-plugin-federation for Vue).`,
      );
      await this.runNx(['g', `@nx/${fw}:app`, `--name=${host}`, `--directory=apps/${host}`]);
      return;
    }

    const remotesFlag = safeRemotes.length > 0 ? [`--remotes=${safeRemotes.join(',')}`] : [];
    await this.runNx(['g', `@nx/${fw}:host`, `--name=${host}`, ...remotesFlag, `--directory=apps/${host}`]);
  }

  async generateApiApp(name: string): Promise<void> {
    const api = assertSafeIdentifier(name, 'API app name');
    this.progress(`Generating NestJS API App [${api}]...`);
    await this.runNx(['g', '@nx/nest:app', `--name=${api}`, `--directory=apps/${api}`]);
  }

  async generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void> {
    const lib = assertSafeIdentifier(name, `${type} library name`);
    this.progress(`Generating Library [${type}/${lib}]...`);

    if (type === 'shared' && lib.includes('ui')) {
      // UI libraries use the active frontend framework — e.g. @nx/react:library,
      // @nx/angular:library, @nx/vue:library.
      const fw = this.frontendFramework;
      this.progress(`Using @nx/${fw}:library for shared UI library.`);
      await this.runNx(['g', `@nx/${fw}:library`, `--name=${lib}`, `--directory=libs/${type}/${lib}`]);
    } else {
      // Domain, shell and non-UI shared libs always use NestJS (backend) generator.
      await this.runNx(['g', '@nx/nest:library', `--name=${lib}`, `--directory=libs/${type}/${lib}`]);
    }
  }
}
