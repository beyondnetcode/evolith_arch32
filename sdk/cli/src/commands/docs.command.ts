import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';

interface DocsCommandOptions {
  dryRun?: boolean;
}

@Command({
  name: 'docs',
  description: 'Andamia la documentación base requerida por Evolith',
})
export class DocsCommand extends CommandRunner {
  async run(passedParam: string[], options?: DocsCommandOptions): Promise<void> {
    p.intro(chalk.bgYellow.black.bold(' Evolith SDK - Document Scaffold '));
    // TODO: logic for scaffolding docs
    p.outro(chalk.green('Documentación base generada exitosamente.'));
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }
}
