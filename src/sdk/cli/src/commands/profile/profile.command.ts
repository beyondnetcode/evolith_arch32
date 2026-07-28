import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { ConfigService, ProfileConfig } from '../../infrastructure/config/config.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION, type ErrorCode } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CLI_EXIT_CODES, carriesCliExitCode, resolveExitCode, setExitCode } from '../../infrastructure/cli/exit-codes';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';

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
          // `return await`, not `return`: `createProfile` is the only async arm,
          // and a bare `return promise` inside a try block lets its rejection
          // escape the catch entirely — so a refused prompt bypassed the
          // envelope and the exit-code mapping below.
          return await this.createProfile(options?.name, json, meta);
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
      // GT-580: classify instead of collapsing. A refused prompt or a bad flag
      // is INVALID_INPUT (3); anything else is a TOOL_FAILURE (1).
      setExitCode(resolveExitCode(error));
      if (json) {
        const code = carriesCliExitCode(error) && error.envelopeErrorCode
          ? (error.envelopeErrorCode as ErrorCode)
          : 'INTERNAL_ERROR';
        console.log(JSON.stringify(createErrorEnvelope(code, message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
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
      // GT-611: routed through PromptService so the non-interactive contract is
      // the SAME one every other command gets. Without a TTY this throws
      // NonInteractiveError (exit 3) instead of painting an ANSI prompt into a
      // pipe that was expecting an envelope.
      try {
        profileName = await this.promptService.text({
          message: 'Profile name:',
          validate: (val) => {
            if (!val || val.trim().length === 0) return 'Name is required';
            if (this.configService.profileExists(val.trim())) return 'Profile already exists';
            return;
          },
        });
      } catch (err) {
        if (!(err instanceof UserCancelledError)) throw err;
        if (json) {
          setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
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
        setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
      return;
    }

    const profile: ProfileConfig = {};

    // GT-611: every field below is OPTIONAL, so a non-interactive invocation
    // must SKIP them, not fail on them. `evolith profile create --name ci
    // --format json` now produces a profile and an envelope with no prompt at
    // all; previously it painted four prompts into the pipe.
    if (this.promptService.isInteractive()) {
      const optional = async (message: string, placeholder?: string): Promise<string | undefined> => {
        try {
          const value = await this.promptService.text({ message, placeholder });
          return value?.trim() ? value.trim() : undefined;
        } catch (err) {
          if (err instanceof UserCancelledError) return undefined;
          throw err;
        }
      };

      const core = await optional('Core repository path (optional):', '../evolith');
      if (core) profile.core = core;
      const satellite = await optional('Satellite repository path (optional):', process.cwd());
      if (satellite) profile.satellite = satellite;
      const tenant = await optional('Tenant (optional):');
      if (tenant) profile.tenant = tenant;
      const initiative = await optional('Initiative (optional):');
      if (initiative) profile.initiative = initiative;
    }

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
      setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
      if (json) {
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
      setExitCode(CLI_EXIT_CODES.TOOL_FAILURE);
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
      }
    }
  }

  private deleteProfile(name?: string, json = false, meta?: any): void {
    if (!name) {
      const message = 'Usage: evolith profile delete <name>';
      setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
      if (json) {
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
      setExitCode(CLI_EXIT_CODES.TOOL_FAILURE);
      if (json) {
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
