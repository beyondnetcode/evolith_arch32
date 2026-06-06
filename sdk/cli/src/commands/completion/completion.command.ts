import { Command, CommandRunner, Option } from 'nest-commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

interface CompletionCommandOptions {
  install?: string;
  shell?: string;
}

@Command({
  name: 'completion',
  description: 'Generate shell completion scripts for evolith CLI',
})
export class CompletionCommand extends CommandRunner {
  private readonly completed = chalk.green('✓');
  private readonly error = chalk.red('✗');

  async run(passedParam: string[], options?: CompletionCommandOptions): Promise<void> {
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
      console.log(`${this.error} Completion scripts not found at ${completionDir}`);
      console.log('Run "evolith completion" to generate them manually.');
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
        console.log(`${this.error} Unknown shell: ${shell}`);
        console.log('Supported shells: bash, zsh, fish');
    }
  }

  private async installBash(completionDir: string): Promise<void> {
    const bashrc = path.join(process.env.HOME || '/root', '.bashrc');
    const completionScript = path.join(completionDir, 'completion.bash');

    if (!(await fs.pathExists(completionScript))) {
      console.log(`${this.error} Bash completion script not found`);
      return;
    }

    const marker = '# Evolith CLI completion';
    const line = `source "${completionScript}"`;

    let content = '';
    if (await fs.pathExists(bashrc)) {
      content = await fs.readFile(bashrc, 'utf-8');
      if (content.includes(marker)) {
        console.log(`${this.completed} Bash completion already installed`);
        return;
      }
    }

    await fs.appendFile(bashrc, `\n${marker}\n${line}\n`);
    console.log(`${this.completed} Bash completion installed`);
    console.log(`  Added to ${bashrc}`);
    console.log('  Reload shell or run: source ~/.bashrc');
  }

  private async installZsh(completionDir: string): Promise<void> {
    const zshrc = path.join(process.env.HOME || '/root', '.zshrc');
    const completionScript = path.join(completionDir, 'completion.zsh');

    if (!(await fs.pathExists(completionScript))) {
      console.log(`${this.error} Zsh completion script not found`);
      return;
    }

    const marker = '# Evolith CLI completion';
    const line = `source "${completionScript}"`;

    let content = '';
    if (await fs.pathExists(zshrc)) {
      content = await fs.readFile(zshrc, 'utf-8');
      if (content.includes(marker)) {
        console.log(`${this.completed} Zsh completion already installed`);
        return;
      }
    }

    await fs.appendFile(zshrc, `\n${marker}\n${line}\n`);
    console.log(`${this.completed} Zsh completion installed`);
    console.log(`  Added to ${zshrc}`);
    console.log('  Reload shell or run: source ~/.zshrc');
  }

  private async installFish(completionDir: string): Promise<void> {
    const fishDir = path.join(process.env.HOME || '/root', '.config', 'fish', 'completions');
    const completionScript = path.join(completionDir, 'completion.fish');
    const targetScript = path.join(fishDir, 'evolith.fish');

    if (!(await fs.pathExists(completionScript))) {
      console.log(`${this.error} Fish completion script not found`);
      return;
    }

    await fs.ensureDir(fishDir);
    await fs.copy(completionScript, targetScript);

    console.log(`${this.completed} Fish completion installed`);
    console.log(`  Copied to ${targetScript}`);
    console.log('  Reload shell or run: fish -l');
  }

  private async showCompletionHelp(shell: string): Promise<void> {
    console.log(chalk.bgCyan.black.bold('\n Evolith CLI - Shell Completion \n'));
    console.log('This command generates shell completion scripts for better UX.\n');

    console.log(chalk.bold('Usage:'));
    console.log('  evolith completion --install <shell>    Install completion for shell');
    console.log('  evolith completion --shell <shell>      Show completion for shell\n');

    console.log(chalk.bold('Supported shells:'));
    console.log('  bash    - Bash (add to ~/.bashrc)');
    console.log('  zsh     - Zsh (add to ~/.zshrc)');
    console.log('  fish    - Fish (copy to completions dir)\n');

    console.log(chalk.bold('Examples:'));
    console.log('  # Install bash completion');
    console.log('  evolith completion --install bash');
    console.log('');
    console.log('  # Install zsh completion');
    console.log('  evolith completion --install zsh');
    console.log('');
    console.log('  # Install fish completion');
    console.log('  evolith completion --install fish\n');

    console.log(chalk.bold(`Detected shell: ${shell}`));
    console.log('');
    console.log(chalk.dim('For manual installation, source the completion script:'));
    console.log(chalk.dim(`  source /path/to/evolith/shell/completion.${shell}`));
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