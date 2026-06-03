import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as p from '@clack/prompts';
import chalk from 'chalk';

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);

  async safeCopy(source: string, destination: string, dryRun: boolean = false): Promise<boolean> {
    if (!await fs.pathExists(source)) {
      this.logger.error(`Source file does not exist: ${source}`);
      return false;
    }

    if (await fs.pathExists(destination)) {
      // Idempotency check: compare contents or ask user
      const sourceContent = await fs.readFile(source, 'utf-8');
      const destContent = await fs.readFile(destination, 'utf-8');

      if (sourceContent === destContent) {
        p.log.info(chalk.gray(`[SKIP] ${destination} ya cumple con el estándar.`));
        return true;
      }

      if (!dryRun) {
        const overwrite = await p.confirm({
          message: `El archivo ${destination} ya existe y es distinto. ¿Deseas sobrescribirlo?`,
          initialValue: false,
        });

        if (!overwrite) {
          p.log.warn(`[SKIP] Omitido: ${destination}`);
          return false;
        }
      } else {
        p.log.info(chalk.yellow(`[DRY-RUN] Se sobrescribiría: ${destination}`));
        return true;
      }
    }

    if (!dryRun) {
      await fs.copy(source, destination, { overwrite: true });
      p.log.success(`[CREADO/ACTUALIZADO] ${destination}`);
    } else {
      p.log.info(chalk.yellow(`[DRY-RUN] Se crearía: ${destination}`));
    }

    return true;
  }
}
