import { Command, Option } from 'nest-commander';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface UpgradeCommandOptions {
  dryRun?: boolean;
  target?: string;
  force?: boolean;
}

@Command({
  name: 'upgrade',
  description: 'Upgrade a satellite to the next progressive-axis topology or governance version',
})
export class UpgradeCommand extends BaseEvolithCommand {
  constructor() {
    super('UpgradeCommand');
  }

  async executeCommand(_passedParam: string[], options?: UpgradeCommandOptions): Promise<void> {
    if (options?.dryRun) {
      this.promptService.showInfo('[dry-run] Upgrade simulation — no changes applied.');
      return;
    }
    const target = options?.target ?? 'latest';
    this.promptService.showIntro(`Evolith Upgrade → ${target}`);
    this.promptService.showInfo('Upgrade in progress. Run with --dry-run to preview.');
  }

  @Option({ flags: '--dry-run', description: 'Simulate upgrade without making changes' })
  parseDryRun(): boolean { return true; }

  @Option({ flags: '--target [version]', description: 'Target governance version or topology' })
  parseTarget(val: string): string { return val; }

  @Option({ flags: '--force', description: 'Skip eligibility checks' })
  parseForce(): boolean { return true; }
}
