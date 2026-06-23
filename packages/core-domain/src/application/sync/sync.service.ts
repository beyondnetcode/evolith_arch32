/* eslint-disable boundaries/element-types */
import { Injectable, Logger, Inject } from "@nestjs/common";
import * as fs from "fs-extra";
import * as path from "path";

export interface IConfigService {
  get<T = Record<string, unknown>>(key: string): T;
}

interface SyncConfig {
  upstreamRoot?: string;
  files?: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(@Inject("IConfigService") private readonly configService: IConfigService) {}

  async syncTemplatesFromUpstream(): Promise<void> {
    const syncConfig = this.configService.get<SyncConfig>("sync");

    // Si no está configurado, asume que se ejecuta desde la raíz de sdk/cli y el repo de Evolith está 2 niveles arriba.
    const evolithRoot =
      syncConfig?.upstreamRoot || path.join(process.cwd(), "..", "..");
    const templatesDir = path.join(process.cwd(), "templates");

    this.logger.log(
      `Sincronizando templates desde ${evolithRoot} hacia ${templatesDir}`,
    );

    const filesToSync = syncConfig?.files || [];

    if (filesToSync.length === 0) {
      this.logger.warn("No files configured for synchronization.");
      return;
    }

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

    this.logger.log("Sincronización de templates completada.");
  }
}
