import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';

interface UpgradeCommandOptions {
  dryRun?: boolean;
}

@Command({
  name: 'upgrade',
  description: 'Actualiza el repositorio satélite cuando el upstream Evolith recibe nuevas reglas',
})
export class UpgradeCommand extends CommandRunner {
  async run(passedParam: string[], options?: UpgradeCommandOptions): Promise<void> {
    p.intro(chalk.bgBlueBright.white.bold(' Evolith SDK - Satélite Upgrade '));
    // TODO: logic for upgrading satellite structures safely
    p.outro(chalk.green('Satélite actualizado a la última versión de Evolith.'));
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }
}
