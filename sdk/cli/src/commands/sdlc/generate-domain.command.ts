import { Command, CommandRunner, Option } from 'nest-commander';
import chalk from 'chalk';
import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs-extra';
import { parseDddModel } from '../../core/generators/mermaid-class-parser';
import { scaffoldHexagonal } from '../../core/generators/hexagonal-scaffolder';

@Command({
  name: 'generate',
  description: 'Generates Hexagonal Architecture scaffold from a Mermaid classDiagram in a Markdown DDD model file',
})
export class GenerateDomainCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    const target = passedParam[0];
    const fromFile: string | undefined = options?.from;

    if (!target || !fromFile) {
      p.log.error('Both a generation target and a source file must be specified.');
      p.log.info(chalk.yellow('Example: evolith sdlc generate domain --from ddd-model.md'));
      return;
    }

    p.intro(chalk.bgCyan.white.bold(' evolith sdlc generate '));

    // ── 1. Resolve and read the source model file ───────────────────────────
    const modelPath = path.resolve(process.cwd(), fromFile);

    if (!await fs.pathExists(modelPath)) {
      p.log.error(`Model file not found: ${chalk.cyan(modelPath)}`);
      process.exit(1);
      return;
    }

    const s = p.spinner();
    s.start('Parsing DDD model…');

    const markdown = await fs.readFile(modelPath, 'utf-8');
    const diagram = parseDddModel(markdown);

    if (!diagram) {
      s.stop('');
      p.log.error('No valid Mermaid classDiagram found in the model file.');
      p.log.info(chalk.dim('Make sure the file contains a ```mermaid block with a classDiagram directive.'));
      process.exit(1);
      return;
    }

    s.stop(`Found ${chalk.cyan(diagram.classes.length)} classes and ${chalk.cyan(diagram.relationships.length)} relationships`);

    // ── 2. Summarise what will be generated ─────────────────────────────────
    p.log.info('');
    p.log.info(chalk.bold('Classes detected:'));
    for (const cls of diagram.classes) {
      const stereoLabel = cls.stereotype !== 'unknown'
        ? chalk.cyan(`[${cls.stereotype}]`)
        : chalk.gray('[unknown]');
      p.log.info(`  ${stereoLabel} ${chalk.white(cls.name)}`);
    }

    // ── 3. Resolve target directory ─────────────────────────────────────────
    const targetDir = path.resolve(process.cwd(), options?.output ?? '.');
    const dryRun: boolean = options?.dryRun === true;

    if (dryRun) {
      p.log.warn('Dry-run mode — no files will be written.');
    }

    p.log.info('');
    p.log.info(`Target directory: ${chalk.cyan(targetDir)}`);

    // ── 4. Scaffold ──────────────────────────────────────────────────────────
    s.start(dryRun ? 'Calculating files to create…' : 'Scaffolding files…');

    const result = await scaffoldHexagonal(diagram, targetDir, dryRun);

    s.stop('Done');

    // ── 5. Report ────────────────────────────────────────────────────────────
    if (result.created.length > 0) {
      p.log.info('');
      p.log.success(`${dryRun ? 'Would create' : 'Created'} ${result.created.length} file(s):`);
      for (const f of result.created) {
        p.log.info(`  ${chalk.green('+')} ${f}`);
      }
    }

    if (result.skipped.length > 0) {
      p.log.warn(`Skipped ${result.skipped.length} already-existing file(s):`);
      for (const f of result.skipped) {
        p.log.info(`  ${chalk.yellow('·')} ${f}`);
      }
    }

    if (result.created.length === 0 && result.skipped.length === 0) {
      p.log.warn('Nothing to generate — no supported stereotypes found.');
    }

    p.outro(
      dryRun
        ? chalk.yellow('Dry-run complete. Run without --dry-run to write files.')
        : chalk.green(`✅ Scaffold complete — ${result.created.length} file(s) created.`),
    );
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
}
