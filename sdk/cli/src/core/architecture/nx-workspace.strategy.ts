import { WorkspaceManagerStrategy } from './workspace-manager.strategy';
import { execSync } from 'child_process';
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

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  private getTargetDir(): string {
    const currentDir = process.cwd();
    return path.join(currentDir, 'src');
  }

  private runNx(command: string) {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      console.log(chalk.yellow(`[DRY-RUN] Would execute in ${targetDir}: npx nx ${command}`));
      return;
    }
    console.log(chalk.gray(`> Executing in ${targetDir}: npx nx ${command}`));
    try {
      execSync(`npx nx ${command} --no-interactive`, { cwd: targetDir, stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red(`\nFailed to execute Nx command: npx nx ${command}`));
      throw error;
    }
  }

  private runNpm(command: string) {
    const targetDir = this.getTargetDir();
    if (this.dryRun) {
      console.log(chalk.yellow(`[DRY-RUN] Would execute in ${targetDir}: npm ${command}`));
      return;
    }
    console.log(chalk.gray(`> Executing in ${targetDir}: npm ${command}`));
    try {
      execSync(`npm ${command} --legacy-peer-deps`, { cwd: targetDir, stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red(`\nFailed to execute npm command: npm ${command}`));
      throw error;
    }
  }

  async installDependencies(frontendFramework: string, orm: string): Promise<void> {
    const fw = frontendFramework.toLowerCase();
    this.frontendFramework = fw;

    console.log(chalk.cyan(`\n📦 Installing Nx Plugins for ${fw.toUpperCase()} and NestJS...`));
    this.runNpm(`install -D @nx/nest @nx/${fw} @nx/webpack`);

    if (orm.toLowerCase() === 'prisma') {
      this.runNpm(`install -D prisma @prisma/client`);
    } else if (orm.toLowerCase() === 'typeorm') {
      this.runNpm(`install -D typeorm`);
    }
  }

  async generateStandardWebApp(name: string, framework: string): Promise<void> {
    const fw = framework.toLowerCase();
    this.frontendFramework = fw;
    console.log(chalk.cyan(`\n🏗️  Generating Standard Web App (Phase 1) [${name}] (${fw.toUpperCase()})...`));
    this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
  }

  async generateHostApp(name: string, remotes: string[], framework: string): Promise<void> {
    const fw = framework.toLowerCase();
    this.frontendFramework = fw;
    console.log(chalk.cyan(`\n🏗️  Generating MFE Host App [${name}] with Remotes [${remotes.join(', ')}] (${fw.toUpperCase()})...`));

    if (!MFE_CAPABLE_FRAMEWORKS.has(fw)) {
      console.log(chalk.yellow(
        `⚠  @nx/${fw} does not provide a native Module Federation :host generator.\n` +
        `   Generating a standard ${fw.toUpperCase()} app instead. Configure MFE manually\n` +
        `   (e.g. @originjs/vite-plugin-federation for Vue).`,
      ));
      this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
      return;
    }

    const remotesFlag = remotes.length > 0 ? `--remotes=${remotes.join(',')}` : '';
    this.runNx(`g @nx/${fw}:host --name=${name} ${remotesFlag} --directory=apps/${name}`);
  }

  async generateApiApp(name: string): Promise<void> {
    console.log(chalk.cyan(`\n⚙️  Generating NestJS API App [${name}]...`));
    this.runNx(`g @nx/nest:app --name=${name} --directory=apps/${name}`);
  }

  async generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void> {
    console.log(chalk.cyan(`\n📚 Generating Library [${type}/${name}]...`));

    if (type === 'shared' && name.includes('ui')) {
      // UI libraries use the active frontend framework — e.g. @nx/react:library,
      // @nx/angular:library, @nx/vue:library.
      const fw = this.frontendFramework;
      console.log(chalk.gray(`   Using @nx/${fw}:library for shared UI library.`));
      this.runNx(`g @nx/${fw}:library --name=${name} --directory=libs/${type}/${name}`);
    } else {
      // Domain, shell and non-UI shared libs always use NestJS (backend) generator.
      this.runNx(`g @nx/nest:library --name=${name} --directory=libs/${type}/${name}`);
    }
  }
}
