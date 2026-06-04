import { WorkspaceManagerStrategy } from './workspace-manager.strategy';
import { execSync } from 'child_process';
import chalk from 'chalk';
import * as path from 'path';
import * as process from 'process';

export class NxWorkspaceStrategy implements WorkspaceManagerStrategy {
  private getTargetDir(): string {
    // Para propositos de esta demostración, el scaffolding debe correr en ./src si existe, o en la ruta actual
    // Ya que estamos corriendo desde dist/main.js en evolith/sdk/cli, process.cwd() sera evolith_tracker
    const currentDir = process.cwd();
    return path.join(currentDir, 'src');
  }

  private runNx(command: string) {
    const targetDir = this.getTargetDir();
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
    console.log(chalk.gray(`> Executing in ${targetDir}: npm ${command}`));
    try {
      execSync(`npm ${command} --legacy-peer-deps`, { cwd: targetDir, stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red(`\nFailed to execute npm command: npm ${command}`));
      throw error;
    }
  }

  async installDependencies(frontendFramework: string, orm: string): Promise<void> {
    console.log(chalk.cyan(`\n📦 Installing Nx Plugins for ${frontendFramework.toUpperCase()} and NestJS...`));
    this.runNpm(`install -D @nx/nest @nx/${frontendFramework.toLowerCase()} @nx/webpack`);
    
    if (orm.toLowerCase() === 'prisma') {
      this.runNpm(`install -D prisma @prisma/client`);
    } else if (orm.toLowerCase() === 'typeorm') {
      this.runNpm(`install -D typeorm`);
    }
  }

  async generateStandardWebApp(name: string, framework: string): Promise<void> {
    console.log(chalk.cyan(`\n🏗️  Generating Standard Web App (Phase 1) [${name}]...`));
    const fw = framework.toLowerCase();
    this.runNx(`g @nx/${fw}:app --name=${name} --directory=apps/${name}`);
  }

  async generateHostApp(name: string, remotes: string[], framework: string): Promise<void> {
    console.log(chalk.cyan(`\n🏗️  Generating MFE Host App [${name}] with Remotes [${remotes.join(', ')}]...`));
    // Example: nx g @nx/react:host --name=tracker-host --remotes=tracker-remote-agile,tracker-remote-qa --directory=apps/tracker-host
    const fw = framework.toLowerCase();
    const remotesFlag = remotes.length > 0 ? `--remotes=${remotes.join(',')}` : '';
    this.runNx(`g @nx/${fw}:host --name=${name} ${remotesFlag} --directory=apps/${name}`);
  }

  async generateApiApp(name: string): Promise<void> {
    console.log(chalk.cyan(`\n⚙️  Generating NestJS API App [${name}]...`));
    this.runNx(`g @nx/nest:app --name=${name} --directory=apps/${name}`);
  }

  async generateLibrary(name: string, type: 'domain' | 'shell' | 'shared'): Promise<void> {
    console.log(chalk.cyan(`\n📚 Generating NestJS Library [${type}/${name}]...`));
    // For domain and shell, we use NestJS libraries. For shared, we can use basic JS/TS or React/Angular libs.
    // Keeping it simple: @nx/nest:library for all backend-related stuff.
    // If it's shared/ui, it should be the frontend framework, but we'll stick to @nx/js for generic or @nx/nest.
    if (type === 'shared' && name.includes('ui')) {
      // Simplification for the POC: just use @nx/js to avoid framework dependency complexities here
      this.runNx(`g @nx/js:library --name=${name} --directory=libs/${type}/${name}`);
    } else {
      this.runNx(`g @nx/nest:library --name=${name} --directory=libs/${type}/${name}`);
    }
  }
}
