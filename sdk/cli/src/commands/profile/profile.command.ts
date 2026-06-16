import { Command, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigService, ProfileConfig } from '../../infrastructure/config/config.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

interface ProfileCommandOptions {
  name?: string;
}

@Command({
  name: 'profile',
  arguments: '<action>',
  description: 'Manage CLI profiles (create, list, switch, delete, current)',
})
export class ProfileCommand extends BaseEvolithCommand {
  constructor(
    readonly configService: ConfigService,
    promptService: PromptService,
  ) {
    super('ProfileCommand', promptService);
  }

  async executeCommand(inputs: string[], options?: ProfileCommandOptions): Promise<void> {
    const action = inputs[0] || 'current';

    switch (action) {
      case 'list':
        return this.listProfiles();
      case 'create':
        return this.createProfile(options?.name);
      case 'switch':
        return this.switchProfile(options?.name);
      case 'delete':
        return this.deleteProfile(options?.name);
      case 'current':
      default:
        return this.showCurrent();
    }
  }

  private showCurrent(): void {
    const active = this.configService.activeProfile();
    const cfg = this.configService.getProfile();
    this.promptService.showIntro('Active Profile');
    console.log(`  Name:      ${chalk.cyan(active)}`);
    if (cfg.core) console.log(`  Core:      ${cfg.core}`);
    if (cfg.satellite) console.log(`  Satellite: ${cfg.satellite}`);
    if (cfg.tenant) console.log(`  Tenant:    ${cfg.tenant}`);
    if (cfg.initiative) console.log(`  Initiative: ${cfg.initiative}`);
    this.promptService.showOutro('');
  }

  private listProfiles(): void {
    const profiles = this.configService.listProfiles();
    const active = this.configService.activeProfile();
    this.promptService.showIntro('CLI Profiles');
    for (const name of profiles) {
      const marker = name === active ? chalk.green('*') : ' ';
      console.log(` ${marker} ${name}`);
    }
    this.promptService.showOutro(`${profiles.length} profile(s)`);
  }

  private async createProfile(name?: string): Promise<void> {
    let profileName = name;
    if (!profileName) {
      profileName = (await p.text({
        message: 'Profile name:',
        validate: (val) => {
          if (!val || val.trim().length === 0) return 'Name is required';
          if (this.configService.profileExists(val.trim())) return 'Profile already exists';
          return;
        },
      })) as string;
      if (p.isCancel(profileName)) {
        this.promptService.showOutro('Cancelled');
        return;
      }
    }

    if (this.configService.profileExists(profileName)) {
      this.promptService.showError(`Profile "${profileName}" already exists`);
      return;
    }

    const profile: ProfileConfig = {};

    const core = (await p.text({
      message: 'Core repository path (optional):',
      placeholder: '../evolith',
    })) as string;
    if (!p.isCancel(core) && core.trim()) profile.core = core.trim();

    const satellite = (await p.text({
      message: 'Satellite repository path (optional):',
      placeholder: process.cwd(),
    })) as string;
    if (!p.isCancel(satellite) && satellite.trim()) profile.satellite = satellite.trim();

    const tenant = (await p.text({
      message: 'Tenant (optional):',
    })) as string;
    if (!p.isCancel(tenant) && tenant.trim()) profile.tenant = tenant.trim();

    const initiative = (await p.text({
      message: 'Initiative (optional):',
    })) as string;
    if (!p.isCancel(initiative) && initiative.trim()) profile.initiative = initiative.trim();

    this.configService.createProfile(profileName, profile);
    this.promptService.showSuccess(`Profile "${profileName}" created`);
  }

  private switchProfile(name?: string): void {
    if (!name) {
      this.promptService.showError('Usage: evolith profile switch <name>');
      return;
    }
    try {
      this.configService.switchProfile(name);
      this.promptService.showSuccess(`Switched to profile "${name}"`);
    } catch (e) {
      this.promptService.showError((e as Error).message);
    }
  }

  private deleteProfile(name?: string): void {
    if (!name) {
      this.promptService.showError('Usage: evolith profile delete <name>');
      return;
    }
    try {
      this.configService.deleteProfile(name);
      this.promptService.showSuccess(`Profile "${name}" deleted`);
    } catch (e) {
      this.promptService.showError((e as Error).message);
    }
  }

  @Option({
    flags: '-n, --name [name]',
    description: 'Profile name',
  })
  parseName(val: string): string {
    return val;
  }
}
