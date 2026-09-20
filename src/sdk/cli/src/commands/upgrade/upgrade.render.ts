/**
 * GT-673 — how an upgrade plan is shown to a human and summarised for a
 * machine. Split out of `upgrade.command.ts` so the command stays a command
 * (options, prompts, exit codes) and the rendering can be read on its own.
 */
import chalk from 'chalk';
import { NO_FINGERPRINT_HINT, UpgradePlan } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';

/** GT-673: the per-class summary every envelope carries, next to the full plan. */
export function divergenceOf(plan: UpgradePlan) {
  return {
    manifestPresent: plan.manifestPresent,
    upstreamOnly: plan.upstreamOnly.map(c => c.relativePath),
    localOnly: plan.localOnly.map(c => c.relativePath),
    conflicts: plan.conflicts.map(c => ({ path: c.relativePath, reason: c.reason ?? 'both-changed' })),
  };
}

export function printUpgradePlan(plan: UpgradePlan): void {
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
    console.log(`  ${getChangeIcon(change.type)} ${change.description}${breaking}`);
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

export function getChangeIcon(type: string): string {
  switch (type) {
    case 'add': return chalk.green('+');
    case 'modify': return chalk.yellow('~');
    case 'remove': return chalk.red('-');
    case 'migrate': return chalk.blue('»');
    default: return '?';
  }
}


