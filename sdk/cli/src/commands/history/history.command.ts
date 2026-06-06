import { Command, CommandRunner, Option } from 'nest-commander';
import chalk from 'chalk';
import { CommandHistoryService } from '../../core/services/command-history.service';

interface HistoryCommandOptions {
  list?: boolean;
  get?: string;
  search?: string;
  stats?: boolean;
  clear?: boolean;
  limit?: number;
  replay?: string;
}

@Command({
  name: 'history',
  description: 'View and manage command history',
})
export class HistoryCommand extends CommandRunner {
  private readonly historyService: CommandHistoryService;

  constructor() {
    super();
    this.historyService = new CommandHistoryService();
  }

  async run(passedParam: string[], options?: HistoryCommandOptions): Promise<void> {
    if (options?.stats) {
      await this.showStats();
    } else if (options?.get) {
      await this.showEntry(options.get);
    } else if (options?.search) {
      await this.searchEntries(options.search);
    } else if (options?.clear) {
      await this.clearHistory();
    } else if (options?.replay) {
      await this.replayCommand(options.replay);
    } else {
      await this.listHistory(options?.limit);
    }
  }

  private async listHistory(limit = 20): Promise<void> {
    console.log(chalk.bgCyan.black.bold('\n Evolith CLI - Command History \n'));

    const entries = await this.historyService.list(limit);

    if (entries.length === 0) {
      console.log(chalk.yellow('  No commands in history'));
      console.log('\n  Commands will be recorded automatically as you use evolith CLI.');
      return;
    }

    console.log(chalk.dim(`Showing last ${entries.length} commands\n`));

    const header = `${chalk.bold('ID')}|${chalk.bold('Time')}|${chalk.bold('Command')}|${chalk.bold('Status')}|${chalk.bold('Duration')}`;
    console.log(header);
    console.log(chalk.dim('─'.repeat(80)));

    for (const entry of entries) {
      const time = new Date(entry.timestamp).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const statusIcon = entry.success ? chalk.green('✓') : chalk.red('✗');
      const duration = entry.durationMs < 1000
        ? `${entry.durationMs}ms`
        : `${(entry.durationMs / 1000).toFixed(1)}s`;

      const cmdText = `${entry.command} ${entry.args.join(' ')}`.substring(0, 40);

      console.log(
        `${chalk.dim(entry.id)}|${chalk.dim(time)}|${cmdText}|${statusIcon}|${chalk.dim(duration)}`
      );
    }

    console.log(chalk.dim('\nUse: evolith history --get <id> for details'));
    console.log(chalk.dim('Use: evolith history --search <query> to search'));
    console.log(chalk.dim('Use: evolith history --stats to see statistics'));
  }

  private async showEntry(id: string): Promise<void> {
    const entry = await this.historyService.get(id);

    if (!entry) {
      console.log(chalk.red(`\nEntry not found: ${id}\n`));
      return;
    }

    console.log(chalk.bgCyan.black.bold(`\n Command History Entry: ${id} \n`));

    console.log(chalk.bold('Timestamp:'), new Date(entry.timestamp).toLocaleString('es-ES'));
    console.log(chalk.bold('Command:'), chalk.cyan(entry.command));
    console.log(chalk.bold('Arguments:'), entry.args.join(' '));
    console.log(chalk.bold('Exit Code:'), entry.exitCode);
    console.log(chalk.bold('Duration:'), `${entry.durationMs}ms`);
    console.log(chalk.bold('Success:'), entry.success ? chalk.green('Yes') : chalk.red('No'));

    console.log(chalk.bold('\nFull Command:'));
    console.log(chalk.dim(`  evolith ${entry.command} ${entry.args.join(' ')}`));
    console.log('');
  }

  private async searchEntries(query: string): Promise<void> {
    console.log(chalk.bgCyan.black.bold(`\n Searching: "${query}" \n`));

    const entries = await this.historyService.search(query);

    if (entries.length === 0) {
      console.log(chalk.yellow(`  No matches found for: ${query}`));
      return;
    }

    console.log(chalk.dim(`Found ${entries.length} matching entries\n`));

    for (const entry of entries.slice(0, 20)) {
      const time = new Date(entry.timestamp).toLocaleString('es-ES');
      const statusIcon = entry.success ? chalk.green('✓') : chalk.red('✗');

      console.log(
        `${chalk.cyan(entry.id)} ${chalk.dim(time)} ${statusIcon} ${chalk.white(entry.command)} ${entry.args.join(' ')}`
      );
    }
    console.log('');
  }

  private async showStats(): Promise<void> {
    const stats = await this.historyService.stats();

    console.log(chalk.bgCyan.black.bold('\n Command History Statistics \n'));

    console.log(chalk.bold('Total Commands:'), stats.totalCommands);
    console.log(chalk.bold('Success Rate:'), chalk.green(stats.successRate));
    console.log(chalk.bold('Last 24h:'), stats.recentCommands);

    if (stats.mostUsed.length > 0) {
      console.log(chalk.bold('\nMost Used Commands:'));
      for (const { command, count } of stats.mostUsed.slice(0, 5)) {
        console.log(`  ${chalk.cyan(command.padEnd(20))} ${count} times`);
      }
    }
    console.log('');
  }

  private async clearHistory(): Promise<void> {
    console.log(chalk.bgYellow.black.bold('\n Clear History \n'));
    console.log('This will permanently delete all command history.\n');

    const confirm = await import('@clack/prompts').then(p =>
      p.confirm({ message: 'Are you sure you want to clear history?' })
    );

    if (confirm) {
      await this.historyService.clear();
      console.log(chalk.green('\n✓ History cleared\n'));
    } else {
      console.log(chalk.dim('\nCancelled\n'));
    }
  }

  private async replayCommand(id: string): Promise<void> {
    const replay = await this.historyService.replay(id);

    if (!replay) {
      console.log(chalk.red(`\nEntry not found: ${id}\n`));
      return;
    }

    console.log(chalk.bold('\nReplay command:'));
    console.log(chalk.cyan(`  evolith ${replay.command} ${replay.args.join(' ')}`));
    console.log(chalk.dim('\nTo execute, run the above command directly.\n'));
  }

  @Option({
    flags: '-l, --list',
    description: 'List recent commands',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-g, --get <id>',
    description: 'Show command details by ID',
  })
  parseGet(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --search <query>',
    description: 'Search commands',
  })
  parseSearch(val: string): string {
    return val;
  }

  @Option({
    flags: '--stats',
    description: 'Show history statistics',
  })
  parseStats(): boolean {
    return true;
  }

  @Option({
    flags: '--clear',
    description: 'Clear all history',
  })
  parseClear(): boolean {
    return true;
  }

  @Option({
    flags: '-n, --limit <number>',
    description: 'Number of entries to show (default: 20)',
  })
  parseLimit(val: string): number {
    return parseInt(val, 10) || 20;
  }

  @Option({
    flags: '--replay <id>',
    description: 'Show command to replay',
  })
  parseReplay(val: string): string {
    return val;
  }
}