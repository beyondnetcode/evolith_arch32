import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface AgentsCommandOptions {
  list?: boolean;
  install?: string;
  status?: boolean;
}

@Command({
  name: 'agents',
  description: 'Manage Evolith BMAD agents (list, install, status)',
})
export class AgentsCommand extends BaseEvolithCommand {
  constructor() {
    super('AgentsCommand');
  }

  async executeCommand(_passedParam: string[], options?: AgentsCommandOptions): Promise<void> {
    if (options?.install) {
      this.promptService.showInfo(`Installing agent: ${options.install}`);
      return;
    }
    if (options?.status) {
      this.promptService.showInfo('Agent status: checking installed agents...');
      return;
    }
    this.promptService.showIntro('Evolith Agents');
    this.promptService.showInfo('Use --list to see available agents, --install <name> to install one.');
  }

  @Option({ flags: '--list', description: 'List available agents' })
  parseList(): boolean { return true; }

  @Option({ flags: '--install [agent]', description: 'Install a named agent' })
  parseInstall(val: string): string { return val; }

  @Option({ flags: '--status', description: 'Show status of installed agents' })
  parseStatus(): boolean { return true; }
}
