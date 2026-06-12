import { Command, Option } from 'nest-commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface CompletionCommandOptions {
  install?: string;
  shell?: string;
}

@Command({
  name: 'completion',
  description: 'Generate shell completion scripts for evolith CLI',
})
export class CompletionCommand extends BaseEvolithCommand {
  private readonly completed = chalk.green('✓');
  private readonly error = chalk.red('✗');

  constructor() {
    super('CompletionCommand');
  }

  async executeCommand(passedParam: string[], options?: CompletionCommandOptions): Promise<void> {
    const shell = options?.shell || this.detectShell();

    if (options?.install) {
      await this.installCompletion(options.install);
      return;
    }

    await this.showCompletionHelp(shell);
  }

  private detectShell(): string {
    const shell = process.env.SHELL || '';
    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('fish')) return 'fish';
    return 'bash';
  }

  private async installCompletion(shell: string): Promise<void> {
    const cliPath = await this.findCliPath();
    const completionDir = path.join(path.dirname(cliPath), '..', 'shell');

    if (!(await fs.pathExists(completionDir))) {
      this.promptService.showError(`${this.error} Completion scripts not found at ${completionDir}`);
      this.promptService.showInfo('Run "evolith completion" to generate them manually.');
      return;
    }

    switch (shell) {
      case 'bash':
        await this.installBash(completionDir);
        break;
      case 'zsh':
        await this.installZsh(completionDir);
        break;
      case 'fish':
        await this.installFish(completionDir);
        break;
      default:
        this.promptService.showError(`${this.error} Unknown shell: ${shell}`);
        this.promptService.showInfo('Supported shells: bash, zsh, fish');
    }
  }

  private async installBash(completionDir: string): Promise<void> {
    const bashrc = path.join(process.env.HOME || '/root', '.bashrc');
    const completionScript = path.join(completionDir, 'completion.bash');

    if (!(await fs.pathExists(completionScript))) {
      this.promptService.showError(`${this.error} Bash completion script not found`);
      return;
    }

    const marker = '# Evolith CLI completion';
    const line = `source "${completionScript}"`;

    let content = '';
    if (await fs.pathExists(bashrc)) {
      content = await fs.readFile(bashrc, 'utf-8');
      if (content.includes(marker)) {
        this.promptService.showSuccess(`${this.completed} Bash completion already installed`);
        return;
      }
    }

    await fs.appendFile(bashrc, `\n${marker}\n${line}\n`);
    this.promptService.showSuccess(`${this.completed} Bash completion installed`);
    this.promptService.showInfo(`  Added to ${bashrc}`);
    this.promptService.showInfo('  Reload shell or run: source ~/.bashrc');
  }

  private async installZsh(completionDir: string): Promise<void> {
    const zshrc = path.join(process.env.HOME || '/root', '.zshrc');
    const completionScript = path.join(completionDir, 'completion.zsh');

    if (!(await fs.pathExists(completionScript))) {
      this.promptService.showError(`${this.error} Zsh completion script not found`);
      return;
    }

    const marker = '# Evolith CLI completion';
    const line = `source "${completionScript}"`;

    let content = '';
    if (await fs.pathExists(zshrc)) {
      content = await fs.readFile(zshrc, 'utf-8');
      if (content.includes(marker)) {
        this.promptService.showSuccess(`${this.completed} Zsh completion already installed`);
        return;
      }
    }

    await fs.appendFile(zshrc, `\n${marker}\n${line}\n`);
    this.promptService.showSuccess(`${this.completed} Zsh completion installed`);
    this.promptService.showInfo(`  Added to ${zshrc}`);
    this.promptService.showInfo('  Reload shell or run: source ~/.zshrc');
  }

  private async installFish(completionDir: string): Promise<void> {
    const fishDir = path.join(process.env.HOME || '/root', '.config', 'fish', 'completions');
    const completionScript = path.join(completionDir, 'completion.fish');
    const targetScript = path.join(fishDir, 'evolith.fish');

    if (!(await fs.pathExists(completionScript))) {
      this.promptService.showError(`${this.error} Fish completion script not found`);
      return;
    }

    await fs.ensureDir(fishDir);
    await fs.copy(completionScript, targetScript);

    this.promptService.showSuccess(`${this.completed} Fish completion installed`);
    this.promptService.showInfo(`  Copied to ${targetScript}`);
    this.promptService.showInfo('  Reload shell or run: fish -l');
  }

  private async showCompletionHelp(shell: string): Promise<void> {
    this.promptService.showIntro('Evolith CLI - Shell Completion');
    this.promptService.showInfo('This command generates shell completion scripts for better UX.\n');

    this.promptService.showInfo(chalk.bold('Usage:'));
    this.promptService.showInfo('  evolith completion --install <shell>    Install completion for shell');
    this.promptService.showInfo('  evolith completion --shell <shell>      Show completion for shell\n');

    this.promptService.showInfo(chalk.bold('Supported shells:'));
    this.promptService.showInfo('  bash    - Bash (add to ~/.bashrc)');
    this.promptService.showInfo('  zsh     - Zsh (add to ~/.zshrc)');
    this.promptService.showInfo('  fish    - Fish (copy to completions dir)\n');

    this.promptService.showInfo(chalk.bold('Examples:'));
    this.promptService.showInfo('  # Install bash completion');
    this.promptService.showInfo('  evolith completion --install bash');
    this.promptService.showInfo('');
    this.promptService.showInfo('  # Install zsh completion');
    this.promptService.showInfo('  evolith completion --install zsh');
    this.promptService.showInfo('');
    this.promptService.showInfo('  # Install fish completion');
    this.promptService.showInfo('  evolith completion --install fish\n');

    this.promptService.showInfo(chalk.bold(`Detected shell: ${shell}`));
    this.promptService.showInfo('');
    this.promptService.showInfo(chalk.dim('For manual installation, source the completion script:'));
    this.promptService.showInfo(chalk.dim(`  source /path/to/evolith/shell/completion.${shell}`));
  }

  private async findCliPath(): Promise<string> {
    return process.argv[1] || 'evolith';
  }

  @Option({
    flags: '--install <shell>',
    description: 'Install completion for specified shell (bash, zsh, fish)',
  })
  parseInstall(val: string): string {
    return val;
  }

  @Option({
    flags: '--shell <shell>',
    description: 'Generate completion for specified shell',
  })
  parseShell(val: string): string {
    return val;
  }
}