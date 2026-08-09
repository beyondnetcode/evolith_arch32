import { Command, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import type { RulesetCatalog } from '@beyondnet/evolith-core-domain/application/validators/ruleset-catalog';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';

interface RulesetsOptions {
  core?: string;
  format?: string;
}

/**
 * `evolith rulesets` — the menu `--select` has been telling callers to read.
 *
 * GT-659 shipped `--select <ref>` with help text reading «by the id the
 * catalogue publishes». Nothing published a catalogue. Selecting was possible
 * only for someone who already knew a ruleset filename by heart, which makes
 * "configurable per tenant" true on paper and false in a terminal.
 *
 * The owner's principle: **the Core PROPOSES; the Tracker, CLI and MCP configure
 * and select.** This command is the proposing half on the CLI, and it is
 * deliberately inert — it evaluates nothing, touches no satellite, and returns no
 * verdict. It answers one question: what can this Core evaluate, and what would
 * adopting each pack cost me.
 *
 * `blocking` is published per pack for that last reason. A tenant deciding what
 * to adopt is entitled to know which packs can turn their build red BEFORE the
 * first red build, not after.
 */
@Command({
  name: 'rulesets',
  description: 'List the ruleset packs this Core can evaluate, with the refs `validate --select` accepts',
})
export class RulesetsCommand extends BaseEvolithCommand {
  constructor(@Inject(RulesetValidatorService) private readonly validator: RulesetValidatorService) {
    super('RulesetsCommand');
  }

  async executeCommand(_passedParam: string[], options?: RulesetsOptions): Promise<void> {
    const opts = options ?? {};
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith rulesets',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    try {
      // Same resolution `validate` uses, so the menu and the run cannot be
      // reading two different corpora — a catalogue of a corpus you are not
      // about to evaluate is worse than no catalogue.
      const { coreRoot } = resolveRulesets(opts.core || this.profile.core || undefined);
      const catalog = await this.validator.catalog(coreRoot);

      if (catalog.packs === 0) {
        // Not a pass. An empty menu means the corpus did not resolve far more
        // often than it means this Core genuinely offers nothing, and reporting
        // it as an ordinary empty list is how a broken --core silently becomes
        // "there is nothing to select".
        const message =
          `No ruleset packs resolved under ${coreRoot}. This is not an empty catalogue — it is a Core ` +
          'that could not be read. Pass --core <path> or set EVOLITH_CORE_PATH.';
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('RULESET_NOT_FOUND', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          return;
        }
        throw new Error(message);
      }

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(catalog, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }

      this.printCatalog(catalog, coreRoot);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      throw error; // Let BaseEvolithCommand render the failure.
    }
  }

  private printCatalog(catalog: RulesetCatalog, coreRoot: string): void {
    console.log(chalk.bold(`\n📚 Ruleset packs this Core can evaluate\n`));
    console.log(chalk.gray(`  core: ${coreRoot}\n`));

    const width = Math.max(...catalog.entries.map((e) => e.ref.length), 4);
    console.log(`  ${chalk.bold('REF'.padEnd(width))}  ${chalk.bold('RULES')}  ${chalk.bold('BLOCKING')}`);
    for (const entry of catalog.entries) {
      // Blocking is coloured, and zero is GREEN rather than grey: a pack that
      // can only report is the safe thing to adopt first, and the table should
      // say so at a glance.
      const blocking = entry.blocking === 0 ? chalk.green('0') : chalk.yellow(String(entry.blocking));
      console.log(`  ${entry.ref.padEnd(width)}  ${String(entry.rules).padStart(5)}  ${blocking.padStart(8)}`);
    }

    console.log('');
    console.log(`  ${chalk.bold(String(catalog.packs))} pack(s) · ${chalk.bold(String(catalog.rules))} rule(s) · ${chalk.bold(String(catalog.blocking))} that can fail a run`);
    console.log('');
    console.log(chalk.gray('  Select what this tenant has adopted:'));
    console.log(chalk.gray(`    evolith validate --select ${catalog.entries[0]?.ref ?? '<ref>'}`));
    console.log(chalk.gray('  Naming nothing evaluates every pack above. A ref this Core does not carry'));
    console.log(chalk.gray('  is a BLOCKING failure, never a quiet pass.'));
    console.log('');
  }

  @Option({
    flags: '-c, --core <path>',
    description: 'Path to the Evolith core repository (default: profile.core or the bundled rulesets)',
  })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format <format>',
    description: 'Output format: text (default) or json (ADR-0073 envelope)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
