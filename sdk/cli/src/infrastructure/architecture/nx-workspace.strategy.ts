// @ts-nocheck
import { WorkspaceManagerStrategy } from '@evolith/core-domain/application/architecture/workspace-manager.strategy';
import { ICommandExecutor } from '@evolith/core-domain/domain/interfaces';
import { PromptService } from '../prompts/prompt.service';
import chalk from 'chalk';
import * as path from 'path';
import * as process from 'process';

/**
 * Frameworks that have native Nx Module Federation (host/remote) support.
 * Vue uses Vite-based MFE which Nx does not scaffold via a dedicated `:host`
 * generator — a standard app is generated and the developer configures MFE
 * manually via `@originjs/vite-plugin-federation` or similar.
 */
const MFE_CAPABLE_FRAMEWORKS = new Set(['react', 'angular']);

export class NxWorkspaceStrategy implements WorkspaceManagerStrategy {
  /** Tracks the active frontend framework after installDependencies is called. */
  private frontendFramework = 'react';
  private dryRun = false;

  constructor(
    private readonly commandExecutor: ICommandExecutor,
    private readonly promptService: PromptService
  ) {}

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  private getTargetDir(): string {
    const currentDir = process.cwd();
    return path.join(currentDir, 'src');
  }

  private async runNx(command: string): Promise<void> {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      this.promptService.showInfo(chalk.yellow(`[DRY-RUN] Would execute in ${targetDir}: npx nx ${command}`));
      return;
    }
    this.promptService.showInfo(chalk.gray(`> Executing in ${targetDir}: npx nx ${command}`));
    
    // We use executeOrThrow so we get standard error throwing
    await this.commandExecutor.executeOrThrow(`npx nx ${command} --no-interactive`, targetDir);
  }

  private async runNpm(command: string): Promise<void> {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      this.promptService.showInfo(chalk.yellow(`[DRY-RUN] Would execute in ${targetDir}: npm ${command}`));
      return;
    }
    this.promptService.showInfo(chalk.gray(`> Executing in ${targetDir}: npm ${command}`));
    
    await this.commandExecutor.executeOrThrow(`npm ${command} --legacy-peer-deps`, targetDir);
  }

  async installDependencies(frontendFramework: string, orm: string): Promise<void> {
    const fw = frontendFramework.toLowerCase();
    this.frontendFramework = fw;

    this.promptService.showInfo(chalk.cyan(`\n📦 Installing Nx Plugins for ${fw.toUpperCase()} and NestJS...`));
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
    this.promptService.showInfo(chalk.cyan(`\n🏗️  Generating Standard Web App (Phase 1) [${name}] (${fw.toUpperCase()})...`));
    await this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
  }

  async generateHostApp(name: string, remotes: string[], framework: string): Promise<void> {
    const fw = framework.toLowerCase();
    this.frontendFramework = fw;
    this.promptService.showInfo(chalk.cyan(`\n🏗️  Generating MFE Host App [${name}] with Remotes [${remotes.join(', ')}] (${fw.toUpperCase()})...`));

    if (!MFE_CAPABLE_FRAMEWORKS.has(fw)) {
      this.promptService.showInfo(chalk.yellow(
        `⚠  @nx/${fw} does not provide a native Module Federation :host generator.\n` +
        `   Generating a standard ${fw.toUpperCase()} app instead. Configure MFE manually\n` +
        `   (e.g. @originjs/vite-plugin-federation for Vue).`
      ));
      await this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
      return;
    }

    const remotesFlag = remotes.length > 0 ? `--remotes=${remotes.join(',')}` : '';
    await this.runNx(`g @nx/${fw}:host --name=${name} ${remotesFlag} --directory=apps/${name}`);
  }

  async generateApiApp(name: string): Promise<void> {
    this.promptService.showInfo(chalk.cyan(`\n⚙️  Generating NestJS API App [${name}]...`));
    await this.runNx(`g @nx/nest:app --name=${name} --directory=apps/${name}`);
  }

  async generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void> {
    this.promptService.showInfo(chalk.cyan(`\n📚 Generating Library [${type}/${name}]...`));

    if (type === 'shared' && name.includes('ui')) {
      // UI libraries use the active frontend framework — e.g. @nx/react:library,
      // @nx/angular:library, @nx/vue:library.
      const fw = this.frontendFramework;
      this.promptService.showInfo(chalk.gray(`   Using @nx/${fw}:library for shared UI library.`));
      await this.runNx(`g @nx/${fw}:library --name=${name} --directory=libs/${type}/${name}`);
    } else {
      // Domain, shell and non-UI shared libs always use NestJS (backend) generator.
      await this.runNx(`g @nx/nest:library --name=${name} --directory=libs/${type}/${name}`);
    }
  }
}
