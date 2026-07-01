import { promises as fs } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const TEMP_PATTERNS = [
  /\.tsbuildinfo$/,
  /\.log$/,
  /\.tmp$/,
  /\.temp$/,
  /\.cache$/,
  /\.swp$/,
  /\.swo$/,
  /~$/,
  /\.bak$/,
  /\.orig$/,
  /\.rej$/,
  /\.pyc$/,
  /\.pyo$/,
  /__pycache__/,
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.eslintcache$/,
  /\.jest-cache/,
  /\.nyc_output/
];

const TEMP_DIRS = [
  'coverage',
  '.nyc_output',
  '.cache'
];

const TEMP_FILES_SPECIFIC = [
  '.harness/evidence/mcp-smoke.evidence.json',
  '.harness/reports/impact-analysis-2026-06-06T11-58-44-930Z.json',
  '.harness/reports/impact-analysis-2026-06-06T11-58-44-930Z.txt'
];

const TEMP_DIRS_SPECIFIC = [
  '.harness/tmp/audit',
  '.harness/tmp/winston-review-KI-EVANS-AGGREGATE-001.md'
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function getAllFiles(dir, fileList = []) {
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', '.husky', '.github'].includes(file)) {
          await getAllFiles(filePath, fileList);
        }
      } else {
        fileList.push({ path: filePath, stat });
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  return fileList;
}

function isTempFile(filePath) {
  return TEMP_PATTERNS.some(pattern => pattern.test(filePath));
}

function isInTempDir(filePath, root = rootDir) {
  const relativePath = path.relative(root, filePath);
  return relativePath.split(path.sep).some(segment => TEMP_DIRS.includes(segment));
}

function loadTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) return new Set();
  return new Set(result.stdout.split('\n').filter(Boolean));
}

function isTrackedFile(filePath, trackedFiles, root = rootDir) {
  const relativePath = path.relative(root, filePath).split(path.sep).join('/');
  return trackedFiles.has(relativePath);
}

async function collectSpecificFiles(trackedFiles) {
  const result = [];
  for (const file of TEMP_FILES_SPECIFIC) {
    const fullPath = path.join(rootDir, file);
    try {
      const stat = await fs.stat(fullPath);
      if (!isTrackedFile(fullPath, trackedFiles)) {
        result.push({ path: fullPath, size: stat.size });
      }
    } catch {
      // File doesn't exist
    }
  }
  return result;
}

async function collectSpecificDirFiles(trackedFiles) {
  const result = [];
  for (const dir of TEMP_DIRS_SPECIFIC) {
    const fullPath = path.join(rootDir, dir);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        const files = await getAllFiles(fullPath);
        for (const { path: filePath, stat: fileStat } of files) {
          if (!isTrackedFile(filePath, trackedFiles)) {
            result.push({ path: filePath, size: fileStat.size });
          }
        }
      } else if (!isTrackedFile(fullPath, trackedFiles)) {
        result.push({ path: fullPath, size: stat.size });
      }
    } catch {
      // File/directory doesn't exist
    }
  }
  return result;
}

async function findTempFiles() {
  const allFiles = await getAllFiles(rootDir);
  const trackedFiles = loadTrackedFiles();
  const tempFiles = [];
  const tempDirFiles = [];

  for (const { path: filePath, stat } of allFiles) {
    if (isTrackedFile(filePath, trackedFiles)) continue;
    if (isTempFile(filePath)) {
      tempFiles.push({ path: filePath, size: stat.size });
    } else if (isInTempDir(filePath)) {
      tempDirFiles.push({ path: filePath, size: stat.size });
    }
  }

  tempFiles.push(...(await collectSpecificFiles(trackedFiles)));
  tempDirFiles.push(...(await collectSpecificDirFiles(trackedFiles)));

  return { tempFiles, tempDirFiles };
}

async function deleteFiles(files) {
  let deletedCount = 0;
  let freedSpace = 0;

  for (const { path: filePath, size } of files) {
    try {
      await fs.unlink(filePath);
      deletedCount++;
      freedSpace += size;
    } catch (error) {
      console.error(`Error deleting ${filePath}: ${error.message}`);
    }
  }

  return { deletedCount, freedSpace };
}

async function deleteDirs(dirs) {
  let deletedCount = 0;
  let freedSpace = 0;

  for (const { path: dirPath, size } of dirs) {
    try {
      const stat = await fs.stat(dirPath);
      if (stat.isDirectory()) {
        await fs.rm(dirPath, { recursive: true, force: true });
      } else {
        await fs.unlink(dirPath);
      }
      deletedCount++;
      freedSpace += size;
    } catch (error) {
      console.error(`Error deleting ${dirPath}: ${error.message}`);
    }
  }

  return { deletedCount, freedSpace };
}

async function main() {
  console.log('=== LIMPIEZA DE ARCHIVOS TEMPORALES ===\n');

  const { tempFiles, tempDirFiles } = await findTempFiles();

  console.log(`Archivos temporales encontrados: ${tempFiles.length}`);
  console.log(`Archivos en directorios temporales: ${tempDirFiles.length}`);
  console.log('');

  // Delete temp files
  const { deletedCount: deletedFiles, freedSpace: freedFromFiles } = await deleteFiles(tempFiles);
  console.log(`✓ Eliminados ${deletedFiles} archivos temporales`);

  // Delete temp dirs
  const { deletedCount: deletedDirs, freedSpace: freedFromDirs } = await deleteDirs(tempDirFiles);
  console.log(`✓ Eliminados ${deletedDirs} archivos en directorios temporales`);

  const totalFreed = freedFromFiles + freedFromDirs;
  console.log(`\nEspacio liberado: ${formatSize(totalFreed)}`);
  console.log('\n=== LIMPIEZA COMPLETADA ===');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

export { TEMP_DIRS, TEMP_PATTERNS, isTempFile, isInTempDir, isTrackedFile };
