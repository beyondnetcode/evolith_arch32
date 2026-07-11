import { Command, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { ConfigService, ProfileConfig } from '../../infrastructure/config/config.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

interface ProfileCommandOptions {
  name?: string;
  format?: string;
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
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith profile',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      startedAt,
    };

    try {
      switch (action) {
        case 'list':
          return this.listProfiles(json, meta);
        case 'create':
          return this.createProfile(options?.name, json, meta);
        case 'switch':
          return this.switchProfile(options?.name, json, meta);
        case 'delete':
          return this.deleteProfile(options?.name, json, meta);
        case 'current':
        default:
          return this.showCurrent(json, meta);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private showCurrent(json = false, meta?: any): void {
    const active = this.configService.activeProfile();
    const cfg = this.configService.getProfile();

    if (json) {
      const result = { name: active, ...cfg };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('Active Profile');
    console.log(`  Name:      ${chalk.cyan(active)}`);
    if (cfg.core) console.log(`  Core:      ${cfg.core}`);
    if (cfg.satellite) console.log(`  Satellite: ${cfg.satellite}`);
    if (cfg.tenant) console.log(`  Tenant:    ${cfg.tenant}`);
    if (cfg.initiative) console.log(`  Initiative: ${cfg.initiative}`);
    this.promptService.showOutro('');
  }

  private listProfiles(json = false, meta?: any): void {
    const profiles = this.configService.listProfiles();
    const active = this.configService.activeProfile();

    if (json) {
      const result = { profiles, active };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('CLI Profiles');
    for (const name of profiles) {
      const marker = name === active ? chalk.green('*') : ' ';
      console.log(` ${marker} ${name}`);
    }
    this.promptService.showOutro(`${profiles.length} profile(s)`);
  }

  private async createProfile(name?: string, json = false, meta?: any): Promise<void> {
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
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', 'Profile creation cancelled', { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
        } else {
          this.promptService.showOutro('Cancelled');
        }
        return;
      }
    }

    if (this.configService.profileExists(profileName)) {
      const message = `Profile "${profileName}" already exists`;
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
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

    if (json) {
      const result = { name: profileName, ...profile };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
    } else {
      this.promptService.showSuccess(`Profile "${profileName}" created`);
    }
  }

  private switchProfile(name?: string, json = false, meta?: any): void {
    if (!name) {
      const message = 'Usage: evolith profile switch <name>';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
      return;
    }
    try {
      this.configService.switchProfile(name);
      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope({ switched: name }, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`Switched to profile "${name}"`);
      }
    } catch (e) {
      const message = (e as Error).message;
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
    }
  }

  private deleteProfile(name?: string, json = false, meta?: any): void {
    if (!name) {
      const message = 'Usage: evolith profile delete <name>';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
      return;
    }
    try {
      this.configService.deleteProfile(name);
      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope({ deleted: name }, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`Profile "${name}" deleted`);
      }
    } catch (e) {
      const message = (e as Error).message;
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
    }
  }

  @Option({
    flags: '-n, --name [name]',
    description: 'Profile name',
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
