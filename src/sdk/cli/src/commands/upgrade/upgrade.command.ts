import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { NO_FINGERPRINT_HINT, SatelliteUpgradeService, UpgradePlan } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { resolveSatellitePath } from '../../infrastructure/paths/satellite-resolver';
import { logger } from '../../infrastructure/observability';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
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

/** GT-673: the per-class summary every envelope carries, next to the full plan. */
function divergenceOf(plan: UpgradePlan) {
  return {
    manifestPresent: plan.manifestPresent,
    upstreamOnly: plan.upstreamOnly.map(c => c.relativePath),
    localOnly: plan.localOnly.map(c => c.relativePath),
    conflicts: plan.conflicts.map(c => ({ path: c.relativePath, reason: c.reason ?? 'both-changed' })),
  };
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
      durationMs: 0,
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
          this.printUpgradePlan(plan);
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
            { ...meta, durationMs: Date.now() - startedAt },
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
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          return;
        }
        this.promptService.showSuccess('Satellite is already up to date');
        this.promptService.showOutro('No upgrade needed.');
        return;
      }

      if (!json) {
        this.printUpgradePlan(plan);
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
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
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
            { ...meta, durationMs: Date.now() - startedAt },
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
          { ...meta, durationMs: Date.now() - startedAt },
        ), null, 2));
      }
    } catch (error: unknown) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      throw error;
    }
  }

  private printUpgradePlan(plan: UpgradePlan): void {
    console.log(chalk.bold('\n📋 Upgrade Plan\n'));
    console.log(`${chalk.bold('Current Version:')} ${chalk.cyan(plan.currentVersion)}`);
    console.log(`${chalk.bold('Target Version:')} ${chalk.cyan(plan.targetVersion)}`);
    console.log(`${chalk.bold('Risk Level:')} ${plan.estimatedRisk === 'high' ? chalk.red(plan.estimatedRisk.toUpperCase()) : plan.estimatedRisk === 'medium' ? chalk.yellow(plan.estimatedRisk.toUpperCase()) : chalk.green(plan.estimatedRisk.toUpperCase())}`);
    console.log(`${chalk.bold('Total Changes:')} ${plan.changes.length}`);

    if (plan.breakingChanges.length > 0) {
      console.log(`${chalk.red('⚠ Breaking Changes:')} ${plan.breakingChanges.length}`);
    }

    // GT-673: the three classes, each by file, so the operator sees what will
    // be written, what is theirs, and what needs a decision.
    const upstreamOnly = plan.upstreamOnly ?? [];
    const localOnly = plan.localOnly ?? [];
    const conflicts = plan.conflicts ?? [];

    console.log(chalk.cyan(`\nUpstream-only (applied): ${upstreamOnly.length}`));
    for (const change of upstreamOnly) {
      const breaking = change.breaking ? chalk.red(' [BREAKING]') : '';
      console.log(`  ${this.getChangeIcon(change.type)} ${change.description}${breaking}`);
    }

    console.log(chalk.cyan(`\nLocal-only (kept, never applied): ${localOnly.length}`));
    for (const change of localOnly) {
      console.log(`  ${chalk.green('=')} ${change.description}`);
    }

    console.log(chalk.cyan(`\nConflicts (not applied without --overwrite-local): ${conflicts.length}`));
    for (const change of conflicts) {
      const breaking = change.breaking ? chalk.red(' [BREAKING]') : '';
      const reason = change.reason === 'no-fingerprint' ? chalk.yellow(' [no fingerprint]') : '';
      console.log(`  ${chalk.red('!')} ${change.description}${reason}${breaking}`);
    }

    if (plan.manifestPresent === false && conflicts.some(c => c.reason === 'no-fingerprint')) {
      console.log(chalk.yellow(`\n${NO_FINGERPRINT_HINT}`));
    }

    console.log('');
  }

  private getChangeIcon(type: string): string {
    switch (type) {
      case 'add': return chalk.green('+');
      case 'modify': return chalk.yellow('~');
      case 'remove': return chalk.red('-');
      case 'migrate': return chalk.blue('»');
      default: return '?';
    }
  }

  private getRiskColor(risk: string): string {
    switch (risk) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
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
