import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { SatelliteUpgradeService } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';
import { divergenceOf, printUpgradePlan } from './upgrade.render';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { resolveSatellitePath } from '../../infrastructure/paths/satellite-resolver';
import { logger } from '../../infrastructure/observability';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
  elapsedMsSince,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

interface UpgradeCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  core?: string;
  report?: boolean;
  satellite?: string;
  format?: string;
  // GT-673
  overwriteLocal?: boolean;
  acceptLocal?: boolean;
}

@Command({
  name: 'upgrade',
  description: 'Upgrade the satellite repository when upstream Evolith ships new rules',
})
export class UpgradeCommand extends BaseEvolithCommand {
  constructor(
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('UpgradeCommand', promptService, configService);
  }

  async executeCommand(passedParam: string[], options?: UpgradeCommandOptions): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith upgrade',
      executedAt: new Date().toISOString(),
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    // ADR-0109: unified satellite resolution replaces the process.cwd() hardcode
    // so `cd mms && evolith upgrade` and `evolith upgrade --satellite mms` both
    // target the project root. Order: explicit --satellite → nearest-ancestor
    // evolith.yaml from cwd → profile.satellite → cwd.
    const satellitePath = resolveSatellitePath({
      explicit: options?.satellite,
      profileSatellite: this.profile.satellite,
    });
    const corePath = options?.core || this.profile.core || this.findCorePath(satellitePath);

    // GT-459: SatelliteUpgradeService needs a filesystem + logger; constructing it
    // bare left `this.fs`/`this.logger` undefined and crashed with a raw
    // "Cannot read properties of undefined (reading 'exists')" stack trace.
    const service = new SatelliteUpgradeService({
      fileSystem: new NodeFileSystemProvider().createFileSystem(),
      logger,
    });

    if (!json) {
      this.promptService.showIntro('Evolith SDK — Satellite Upgrade');
      this.promptService.startSpinner('Planning upgrade...');
    }

    try {
      const plan = await service.planUpgrade({ satellitePath, corePath });
      if (!json) {
        this.promptService.stopSpinner();
      }

      // GT-673: `--accept-local` records the baseline and copies nothing. It
      // has its own path because "no changes" is not "nothing to baseline".
      if (options?.acceptLocal) {
        if (!json) {
          printUpgradePlan(plan);
          const confirm = await this.promptService.confirm(
            'Record the current Core content as the baseline for every tracked ruleset (nothing is copied)?',
            true,
          );
          if (!confirm) {
            this.promptService.showOutro('Upgrade cancelled.');
            return;
          }
        }
        const result = await service.executeUpgrade({ satellitePath, corePath, acceptLocal: true, dryRun: options?.dryRun });
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope(
            { ...result, divergence: divergenceOf(result.plan), dryRun: Boolean(options?.dryRun) },
            { ...meta, durationMs: elapsedMsSince(startedAt) },
          ), null, 2));
          return;
        }
        if (options?.dryRun) {
          this.promptService.showInfo(`Dry run: would record the baseline for ${result.baselinedFiles.length} file(s)`);
        } else {
          this.promptService.showSuccess(`Baseline recorded for ${result.baselinedFiles.length} file(s)`);
        }
        result.baselinedFiles.forEach(f => this.promptService.showInfo(`  = ${f}`));
        this.promptService.showOutro(options?.dryRun ? 'Dry run finished.' : 'Baseline finished. Run `evolith upgrade` again to apply upstream changes.');
        return;
      }

      if (plan.changes.length === 0) {
        const result = { success: true, message: 'Satellite is already up to date', divergence: divergenceOf(plan) };
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: elapsedMsSince(startedAt) }), null, 2));
          return;
        }
        this.promptService.showSuccess('Satellite is already up to date');
        this.promptService.showOutro('No upgrade needed.');
        return;
      }

      if (!json) {
        printUpgradePlan(plan);
      }

      if (options?.dryRun) {
        // GT-673: the dry run IS the divergence report (criterion 5), so the
        // envelope carries the plan and the three classes, not just a message.
        const dryResult = await service.executeUpgrade({
          satellitePath,
          corePath,
          dryRun: true,
          overwriteLocal: options?.overwriteLocal,
        });

        if (json) {
          const result = {
            success: true,
            message: 'Dry run complete - no changes applied',
            dryRun: true,
            plan: dryResult.plan,
            divergence: divergenceOf(dryResult.plan),
            warnings: dryResult.warnings,
          };
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: elapsedMsSince(startedAt) }), null, 2));
          return;
        }
        this.promptService.showInfo('Dry run complete - no changes applied');
        this.promptService.showOutro('Dry run finished.');
        return;
      }

      // GT-673: what this run would write — conflicts only under --overwrite-local.
      const toApply = options?.overwriteLocal ? [...plan.upstreamOnly, ...plan.conflicts] : plan.upstreamOnly;
      const breakingToApply = toApply.filter(c => c.breaking);

      if (breakingToApply.length > 0 && !options?.force) {
        if (!json) {
          this.promptService.showWarning(`⚠ ${breakingToApply.length} breaking change(s) detected`);
          this.promptService.showInfo('Use --force to proceed with breaking changes');
          this.promptService.showOutro('Upgrade cancelled.');
        } else {
          const result = await service.executeUpgrade({ satellitePath, corePath, overwriteLocal: options?.overwriteLocal });
          console.log(JSON.stringify(createSuccessEnvelope(
            { ...result, divergence: divergenceOf(result.plan) },
            { ...meta, durationMs: elapsedMsSince(startedAt) },
          ), null, 2));
        }
        return;
      }

      if (!json) {
        if (options?.overwriteLocal && plan.conflicts.length > 0) {
          // The plan names every file the flag will overwrite; the prompt repeats it.
          this.promptService.showWarning(`--overwrite-local will OVERWRITE ${plan.conflicts.length} local file(s):`);
          plan.conflicts.forEach(c => this.promptService.showWarning(`  ✗ ${c.relativePath}`));
        }
        if (toApply.length === 0) {
          this.promptService.showInfo('Nothing to apply: every difference is a local edit or a conflict (see above).');
        } else {
          const confirm = await this.promptService.confirm(`Apply ${toApply.length} change(s)?`, true);
          if (!confirm) {
            this.promptService.showOutro('Upgrade cancelled.');
            return;
          }
        }

        this.promptService.startSpinner('Applying upgrade...');
      }

      const result = await service.executeUpgrade({
        satellitePath,
        corePath,
        force: options?.force,
        overwriteLocal: options?.overwriteLocal,
      });

      if (!json) {
        this.promptService.stopSpinner();

        const report = await service.getUpgradeReport(result);
        console.log(`\n${chalk.bgCyan.black(' Upgrade Report ')}\n${report}\n`);

        if (result.success) {
          this.promptService.showSuccess(`Upgrade complete: ${result.changesApplied} change(s) applied`);
        } else {
          this.promptService.showError(`Upgrade completed with errors: ${result.errors.length}`);
        }

        this.promptService.showOutro(result.success ? 'Upgrade finished.' : 'Upgrade finished with errors.');
      } else {
        console.log(JSON.stringify(createSuccessEnvelope(
          { ...result, divergence: divergenceOf(result.plan) },
          { ...meta, durationMs: elapsedMsSince(startedAt) },
        ), null, 2));
      }
    } catch (error: unknown) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      throw error;
    }
  }

  private findCorePath(satellitePath: string): string {
    return satellitePath;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Dry run: change nothing on disk',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force upgrade even with breaking changes',
  })
  parseForce(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --core [path]',
    description: 'Path to Evolith core repository',
  })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --satellite [path]',
    description: 'Satellite project path (default: nearest-ancestor evolith.yaml from cwd)',
  })
  parseSatellite(val: string): string {
    return val;
  }

  @Option({
    flags: '--overwrite-local',
    description: 'GT-673: also apply conflicts, overwriting local edits (the plan names every file; a backup is taken)',
  })
  parseOverwriteLocal(): boolean {
    return true;
  }

  @Option({
    flags: '--accept-local',
    description: 'GT-673: record the current Core content as the baseline (.evolith/scaffold-manifest.json) without copying anything',
  })
  parseAcceptLocal(): boolean {
    return true;
  }

  @Option({
    flags: '--report',
    description: 'Show detailed upgrade report',
  })
  parseReport(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
