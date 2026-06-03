import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  async syncTemplatesFromUpstream(): Promise<void> {
    // Esta función asume que se ejecuta desde la raíz de sdk/cli y el repo de Evolith está 2 niveles arriba.
    const evolithRoot = path.join(process.cwd(), '..', '..');
    const templatesDir = path.join(process.cwd(), 'templates');

    this.logger.log(`Sincronizando templates desde ${evolithRoot} hacia ${templatesDir}`);

    const filesToSync = [
      'README.md',
      'README.es.md',
      'AGENTS.md',
      'AGENTS.es.md',
      'LICENSE',
      '.harness/rules/global-rules.md'
    ];

    for (const file of filesToSync) {
      const source = path.join(evolithRoot, file);
      const dest = path.join(templatesDir, path.basename(file));

      if (await fs.pathExists(source)) {
        await fs.copy(source, dest, { overwrite: true });
        this.logger.debug(`Synced: ${file}`);
      } else {
        this.logger.warn(`Source file not found: ${source}`);
      }
    }

    this.logger.log('Sincronización de templates completada.');
  }
}
