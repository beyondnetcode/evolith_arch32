/**
 * GT-585 · criterion 2 — `evolith calibrate report`.
 *
 * Reads a set of adjudicated gate decisions and reports, per ruleset, a confusion matrix, the
 * false-block rate with a Wilson 95% interval, and Cohen's κ — inside the ADR-0073 envelope.
 *
 * WHY IT EXISTS BEFORE ITS DATA. 167 rulesets decide `blocking` and not one has ever been measured.
 * The label corpus this consumes — a human overriding a gate decision — needs something running in
 * production (`GT-435`/`GT-448`), so it does not exist yet. Building the instrument now is what
 * makes the figure DERIVABLE the day labels appear, instead of retrofitted later by whoever needs
 * the number to look good.
 *
 * WHAT IT REFUSES TO DO. It does not invent a verdict. A calibration report is a measurement, not a
 * gate: a high false-block rate is a finding for a human to act on, not something to fail a build
 * over, and wiring it to `BLOCKED` would make every honest measurement look like a regression. The
 * only non-zero exits here are for a malformed invocation and for a corpus it cannot read.
 */

import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import {
  buildCalibrationReport,
  type CalibrationLabel,
  type RateWithInterval,
} from '@beyondnet/evolith-core-domain/domain/calibration';

import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CLI_EXIT_CODES, CliUsageError, setExitCode } from '../../infrastructure/cli/exit-codes';

interface CalibrateCommandOptions {
  labels?: string;
  format?: string;
}

@Command({
  name: 'calibrate',
  description: 'Report gate calibration: confusion matrix, false-block rate and κ (GT-585)',
  arguments: '<action>',
})
export class CalibrateCommand extends BaseEvolithCommand {
  constructor() {
    super('CalibrateCommand');
  }

  @Option({
    flags: '--labels <path>',
    description: 'JSON or JSONL file of adjudicated decisions { subject, rulesetId, gateBlocked, humanBlocked }',
  })
  parseLabels(value: string): string {
    return value;
  }

  @Option({ flags: '--format <format>', description: 'Output format: text | json' })
  parseFormat(value: string): string {
    return value;
  }

  async executeCommand(inputs: string[], options?: CalibrateCommandOptions): Promise<void> {
    const action = inputs[0];
    if (action !== 'report') {
      throw new CliUsageError(`Unknown calibrate action "${action ?? ''}". Supported actions: report`);
    }
    await this.report(options ?? {});
  }

  private async report(options: CalibrateCommandOptions): Promise<void> {
    const json = options.format === 'json';
    const meta = {
      command: 'evolith calibrate report',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!options.labels) {
      throw new CliUsageError(
        '`--labels <path>` is required. There is no default corpus and inventing one would be the ' +
          'exact failure this command exists to prevent.',
      );
    }

    const labelsPath = path.resolve(options.labels);
    let raw: string;
    try {
      raw = await fs.readFile(labelsPath, 'utf-8');
    } catch {
      // An unreadable corpus is a TOOL failure, not "a gate with no false blocks". The difference
      // matters: the second reads as a perfect score.
      // `IO_ERROR` from the closed ERROR_CODES list rather than a bespoke code: the envelope's
      // vocabulary is a contract, and a consumer switching on it must not meet a new member.
      const envelope = createErrorEnvelope(
        'IO_ERROR',
        `Cannot read the calibration corpus at ${labelsPath}`,
        meta,
      );
      if (json) process.stdout.write(`${JSON.stringify(envelope)}\n`);
      else console.error(chalk.red(`✗ Cannot read labels at ${labelsPath}`));
      setExitCode(CLI_EXIT_CODES.TOOL_FAILURE);
      return;
    }

    let labels: CalibrationLabel[];
    try {
      labels = parseLabels(raw);
    } catch (error) {
      throw new CliUsageError(
        `Malformed label corpus at ${labelsPath}: ${(error as Error).message}`,
      );
    }

    const report = buildCalibrationReport(labels);
    const envelope = createSuccessEnvelope(report, meta);

    if (json) {
      process.stdout.write(`${JSON.stringify(envelope)}\n`);
      setExitCode(CLI_EXIT_CODES.OK);
      return;
    }

    console.log(chalk.bold(`\nGate calibration — ${report.labelCount} label(s), ${report.rulesetCount} ruleset(s)`));
    console.log(
      report.humanAgreementCeiling === null
        ? chalk.yellow('  human agreement ceiling: none (no label carries a second rater)')
        : `  human agreement ceiling: κ=${report.humanAgreementCeiling.toFixed(3)}`,
    );

    for (const r of report.perRuleset) {
      const m = r.matrix;
      console.log(`\n  ${chalk.cyan(r.rulesetId)}`);
      console.log(
        `    blocked/agreed ${m.truePositive}  blocked/overridden ${m.falsePositive}  ` +
          `allowed/should-block ${m.falseNegative}  allowed/agreed ${m.trueNegative}`,
      );
      console.log(`    false-block rate ${fmtRate(r.falseBlockRate)}`);
      console.log(`    precision ${fmtRate(r.precision)}   recall ${fmtRate(r.recall)}`);
      console.log(`    κ ${r.kappa === null ? 'undefined (sample cannot support it)' : r.kappa.toFixed(3)}`);
      if (!r.reportable) console.log(chalk.yellow(`    not quotable: ${r.notReportableBecause}`));
    }

    for (const c of report.caveats) console.log(chalk.yellow(`\n  ! ${c}`));
    setExitCode(CLI_EXIT_CODES.OK);
  }
}

/** Never prints a bare point estimate: the interval and the denominator travel with it. */
function fmtRate(r: RateWithInterval): string {
  if (r.value === null) return 'undefined (no observations)';
  const pct = (n: number) => `${(100 * n).toFixed(1)}%`;
  return `${pct(r.value)} [${pct(r.lower as number)}–${pct(r.upper as number)}] n=${r.denominator}`;
}

/**
 * Accepts JSON array or JSONL, because a corpus that grows one adjudication at a time is naturally
 * append-only and forcing it into a single array invites a merge conflict per label.
 */
export function parseLabels(raw: string): CalibrationLabel[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];

  const rows: unknown[] = trimmed.startsWith('[')
    ? (JSON.parse(trimmed) as unknown[])
    : trimmed
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//'))
        .map((l) => JSON.parse(l) as unknown);

  return rows.map((row, i) => {
    const r = row as Record<string, unknown>;
    for (const field of ['subject', 'rulesetId'] as const) {
      if (typeof r[field] !== 'string' || (r[field] as string).length === 0) {
        throw new Error(`row ${i + 1}: \`${field}\` must be a non-empty string`);
      }
    }
    for (const field of ['gateBlocked', 'humanBlocked'] as const) {
      if (typeof r[field] !== 'boolean') {
        // Coercing a missing verdict to `false` would silently record "allowed" for a row nobody
        // adjudicated, which biases every figure downward.
        throw new Error(`row ${i + 1}: \`${field}\` must be a boolean`);
      }
    }
    if (r.secondHumanBlocked !== undefined && typeof r.secondHumanBlocked !== 'boolean') {
      throw new Error(`row ${i + 1}: \`secondHumanBlocked\` must be a boolean when present`);
    }
    return {
      subject: r.subject as string,
      rulesetId: r.rulesetId as string,
      gateBlocked: r.gateBlocked as boolean,
      humanBlocked: r.humanBlocked as boolean,
      ...(r.secondHumanBlocked === undefined ? {} : { secondHumanBlocked: r.secondHumanBlocked as boolean }),
    };
  });
}
