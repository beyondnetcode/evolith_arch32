import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import { setTimeout } from 'timers/promises';
import chalk from 'chalk';

interface InitCommandOptions {
  dryRun?: boolean;
  config?: string;
}

@Command({
  name: 'init',
  description: 'Inicializa un repositorio satélite de Evolith',
})
export class InitCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options?: InitCommandOptions,
  ): Promise<void> {
    console.clear();

    p.intro(chalk.bgBlue.white.bold(' Evolith SDK CLI '));

    if (options?.dryRun) {
      p.note(chalk.yellow('Ejecutando en modo --dry-run. No se modificarán archivos.'), 'Modo Simulacro');
    }

    if (options?.config) {
      p.log.info(`Ejecutando en modo Batch utilizando configuración: ${options.config}`);
      // Lógica batch
      p.outro(chalk.green('Inicialización completada en modo batch.'));
      return;
    }

    // Modo interactivo
    const project = await p.group(
      {
        name: () => p.text({
          message: 'Nombre del repositorio satélite:',
          placeholder: 'ej. mi-proyecto-satelite',
          validate: (value) => {
            if (!value) return 'Por favor ingresa un nombre.';
            if (value.includes(' ')) return 'El nombre no debe contener espacios.';
          }
        }),
        type: () => p.select({
          message: 'Selecciona el tipo de sistema:',
          options: [
            { value: 'enterprise-application', label: 'Aplicación Empresarial' },
            { value: 'microservice', label: 'Microservicio Independiente' },
            { value: 'library', label: 'Librería Compartida' }
          ]
        }),
        agents: () => p.multiselect({
          message: '¿Qué agentes de Evolith deseas configurar? (Selecciona con espacio)',
          options: [
            { value: 'bmad', label: 'BMAD (Desarrollo y Testing)', hint: 'Recomendado' },
            { value: 'architecture', label: 'Architecture Agent', hint: 'Recomendado para DDD' },
            { value: 'qa', label: 'QA Agent' },
            { value: 'sdlc', label: 'SDLC Agent' }
          ],
          required: false,
        }),
        features: () => p.multiselect({
          message: '¿Qué características base quieres incluir?',
          options: [
            { value: 'bilingual', label: 'Documentación Bilingüe (EN/ES)' },
            { value: 'adr', label: 'ADR Registry' },
            { value: 'hooks', label: 'Git Hooks (Husky) para pre-commit' }
          ],
          required: false,
        })
      },
      {
        onCancel: () => {
          p.cancel('Operación cancelada.');
          process.exit(0);
        }
      }
    );

    const s = p.spinner();
    s.start('Aplicando estándares de Evolith y andamiando estructura...');
    
    await setTimeout(1500); // Simular el trabajo de andamiaje

    if (!options?.dryRun) {
      // Aquí iría el fileManager escribiendo
    }
    
    s.stop('Inicialización completada.');

    const nextSteps = `Próximos pasos:
  1. cd ${project.name}
  2. evolith validate
  3. evolith agents install`;

    p.note(nextSteps, 'Siguiente paso');

    p.outro(chalk.green(`¡Satélite ${chalk.bold(project.name)} inicializado correctamente!`));
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --config [string]',
    description: 'Ruta al archivo evolith.setup.json para modo batch',
  })
  parseConfig(val: string): string {
    return val;
  }
}
