import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';

interface AgentsCommandOptions {
  dryRun?: boolean;
}

@Command({
  name: 'agents',
  description: 'Instala o remueve agentes de Evolith en el repositorio satélite',
})
export class AgentsCommand extends CommandRunner {
  async run(passedParam: string[], options?: AgentsCommandOptions): Promise<void> {
    const action = passedParam[0] || 'install';

    if (action === 'install') {
      p.intro(chalk.bgCyan.white.bold(' Evolith SDK - Agents Installer '));
      // TODO: Logic for agent installation
      p.outro(chalk.green('Agentes instalados correctamente.'));
    } else {
      p.log.warn(`Acción no soportada: ${action}`);
    }
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }
}
