/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

export async function findJsonFiles(fs: IFileSystem, dirPath: string): Promise<string[]> {
  const files: string[] = [];
  if (!await fs.exists(dirPath)) return files;

  const entries = await fs.readdirNames(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    try {
      const stat = await fs.stat(fullPath);
      if ((stat as any).isDirectory && (stat as any).isDirectory()) {
        files.push(...await findJsonFiles(fs, fullPath));
      } else if (entry.endsWith('.json')) {
        files.push(fullPath);
      }
    } catch {
      // Skip entries that can't be stat'd
    }
  }
  return files;
}

export async function copyDirectory(fs: IFileSystem, source: string, target: string): Promise<void> {
  const entries = await fs.readdirNames(source);
  for (const entry of entries) {
    const sourcePath = path.join(source, entry);
    const targetPath = path.join(target, entry);
    try {
      const stat = await fs.stat(sourcePath);
      if ((stat as any).isDirectory && (stat as any).isDirectory()) {
        await fs.ensureDir(targetPath);
        await copyDirectory(fs, sourcePath, targetPath);
      } else {
        const content = await fs.readFile(sourcePath);
        await fs.writeFile(targetPath, content);
      }
    } catch {
      // Skip entries that can't be copied
    }
  }
}

export async function createBackup(fs: IFileSystem, logger: ILogger, satellitePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(satellitePath, `.evolith-backup-${timestamp}`);
  await fs.ensureDir(backupPath);

  const dirsToBackup = ['rulesets', '.harness', 'reference'];
  for (const dir of dirsToBackup) {
    const sourceDir = path.join(satellitePath, dir);
    const backupDir = path.join(backupPath, dir);
    if (await fs.exists(sourceDir)) {
      await fs.ensureDir(backupDir);
      await copyDirectory(fs, sourceDir, backupDir);
    }
  }

  logger.info('Backup created', JSON.stringify({ backupPath }));
  return backupPath;
}
