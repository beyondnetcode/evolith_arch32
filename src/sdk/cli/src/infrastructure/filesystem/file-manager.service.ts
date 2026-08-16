import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';

export interface SafeCopyResult {
  status: 'copied' | 'skipped' | 'conflict' | 'error';
  message?: string;
}

export interface SafeCopyOptions {
  dryRun?: boolean;
  overwrite?: boolean;
}

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);

  async safeCopy(source: string, destination: string, options: SafeCopyOptions = {}): Promise<SafeCopyResult> {
    const { dryRun = false, overwrite = false } = options;

    if (!await fs.pathExists(source)) {
      this.logger.error(`Source file does not exist: ${source}`);
      return { status: 'error', message: `Source file does not exist: ${source}` };
    }

    if (await fs.pathExists(destination)) {
      const sourceContent = await fs.readFile(source, 'utf-8');
      const destContent = await fs.readFile(destination, 'utf-8');

      if (sourceContent === destContent) {
        return { status: 'skipped', message: `[SKIP] ${destination} already meets the standard.` };
      }

      if (!overwrite) {
        return { status: 'conflict', message: `${destination} already exists and differs.` };
      }
    }

    if (!dryRun) {
      await fs.copy(source, destination, { overwrite: true });
      return { status: 'copied', message: `[CREADO/ACTUALIZADO] ${destination}` };
    } else {
      return { status: 'skipped', message: `[DRY-RUN] Would create/update: ${destination}` };
    }
  }
}
