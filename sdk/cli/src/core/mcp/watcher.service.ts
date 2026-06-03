import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as chokidar from 'chokidar';

@Injectable()
export class WatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(WatcherService.name);
  private watcher: chokidar.FSWatcher;

  startWatching(cwd: string = process.cwd()): void {
    this.logger.log(`Iniciando Evolith Watcher en: ${cwd}`);

    this.watcher = chokidar.watch([
      '**/*.md',
      'package.json',
      'evolith.setup.json',
    ], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      cwd,
    });

    this.watcher
      .on('change', (path) => this.handleFileChange(path))
      .on('error', (error) => this.logger.error(`Watcher error: ${error}`));
  }

  private handleFileChange(filePath: string): void {
    // Aquí implementamos la heurística para recomendar promover hacia Upstream.
    this.logger.debug(`Cambio detectado en: ${filePath}`);
    
    if (filePath.includes('architecture') || filePath.includes('docs/')) {
      this.logger.log(`[IDE NOTIFY] El archivo ${filePath} tiene cambios relevantes. ¿Deseas promover este patrón al repositorio oficial Evolith?`);
      // Esto emitiría un evento hacia la UI del IDE / Antigravity vía MCP
    }
  }

  onModuleDestroy() {
    if (this.watcher) {
      this.watcher.close();
      this.logger.log('Watcher detenido.');
    }
  }
}
