import { SubCommand, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import * as path from 'path';
import * as fs from 'fs-extra';
import { parseDddModel } from '@beyondnet/evolith-core-domain/application/generators/mermaid-class-parser';
import { scaffoldHexagonal } from '@beyondnet/evolith-core-domain/application/generators/hexagonal-scaffolder';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

@SubCommand({
  name: 'generate',
  description: 'Generates Hexagonal Architecture scaffold from a Mermaid classDiagram in a Markdown DDD model file',
})
export class GenerateDomainCommand extends BaseEvolithCommand {
  constructor() {
    super('GenerateDomainCommand');
  }

  async executeCommand(
    passedParam: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    const target = passedParam[0];
    const fromFile = options?.from as string | undefined;
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith sdlc generate',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!target || !fromFile) {
      if (!json) {
        this.promptService.showError('Both a generation target and a source file must be specified.');
        this.promptService.showInfo(chalk.yellow('Example: evolith sdlc generate domain --from ddd-model.md'));
      }
      throw new Error('Both a generation target and a source file must be specified.');
    }

    if (!json) {
      this.promptService.showIntro('evolith sdlc generate');
    }

    // ── 1. Resolve and read the source model file ───────────────────────────
    const modelPath = path.resolve(process.cwd(), fromFile);

    if (!await fs.pathExists(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    if (!json) {
      this.promptService.startSpinner('Parsing DDD model…');
    }

    const markdown = await fs.readFile(modelPath, 'utf-8');
    const diagram = parseDddModel(markdown);

    if (!diagram) {
      if (!json) {
        this.promptService.stopSpinner('');
        this.promptService.showInfo(chalk.dim('Make sure the file contains a ```mermaid block with a classDiagram directive.'));
      }
      throw new Error('No valid Mermaid classDiagram found in the model file.');
    }

    if (!json) {
      this.promptService.stopSpinner(`Found ${chalk.cyan(diagram.classes.length)} classes and ${chalk.cyan(diagram.relationships.length)} relationships`);

      // ── 2. Summarise what will be generated ─────────────────────────────────
      this.promptService.showInfo('');
      this.promptService.showInfo(chalk.bold('Classes detected:'));
      for (const cls of diagram.classes) {
        const stereoLabel = cls.stereotype !== 'unknown'
          ? chalk.cyan(`[${cls.stereotype}]`)
          : chalk.gray('[unknown]');
        this.promptService.showInfo(`  ${stereoLabel} ${chalk.white(cls.name)}`);
      }
    }

    // ── 3. Resolve target directory ─────────────────────────────────────────
    const targetDir = path.resolve(process.cwd(), (options?.output as string | undefined) ?? '.');
    const dryRun: boolean = options?.dryRun === true;

    if (!json) {
      if (dryRun) {
        this.promptService.showWarning('Dry-run mode — no files will be written.');
      }

      this.promptService.showInfo('');
      this.promptService.showInfo(`Target directory: ${chalk.cyan(targetDir)}`);

      // ── 4. Scaffold ──────────────────────────────────────────────────────────
      this.promptService.startSpinner(dryRun ? 'Calculating files to create…' : 'Scaffolding files…');
    }

    const result = await scaffoldHexagonal(diagram, targetDir, dryRun);

    if (!json) {
      this.promptService.stopSpinner('Done');

      // ── 5. Report ────────────────────────────────────────────────────────────
      if (result.created.length > 0) {
        this.promptService.showInfo('');
        this.promptService.showSuccess(`${dryRun ? 'Would create' : 'Created'} ${result.created.length} file(s):`);
        for (const f of result.created) {
          this.promptService.showInfo(`  ${chalk.green('+')} ${f}`);
        }
      }

      if (result.skipped.length > 0) {
        this.promptService.showWarning(`Skipped ${result.skipped.length} already-existing file(s):`);
        for (const f of result.skipped) {
          this.promptService.showInfo(`  ${chalk.yellow('·')} ${f}`);
        }
      }

      if (result.created.length === 0 && result.skipped.length === 0) {
        this.promptService.showWarning('Nothing to generate — no supported stereotypes found.');
      }

      this.promptService.showOutro(
        dryRun
          ? chalk.yellow('Dry-run complete. Run without --dry-run to write files.')
          : chalk.green(`✅ Scaffold complete — ${result.created.length} file(s) created.`),
      );
    } else {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
    }
  }

  @Option({
    flags: '-f, --from <path>',
    description: 'Path to the Markdown DDD model file containing a Mermaid classDiagram',
  })
  parseFrom(val: string): string {
    return val;
  }

  @Option({
    flags: '-o, --output <dir>',
    description: 'Target directory for generated files (default: current working directory)',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--dry-run',
    description: 'Print what would be generated without writing any files',
  })
  parseDryRun(): boolean {
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
