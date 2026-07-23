/**
 * DIP TODO: Directly imports `fs`. Should accept IFileSystem via injection
 * for testability and hexagonal boundary compliance.
 */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';
import { SatelliteRecord } from '../../domain/satellite-record';
import { IGitHubApiClient } from '../../domain/github-api-client.interface';
import { ILogger } from '../../domain/interfaces';
import { enumerateWorkspaceProjects } from '../../domain/workspace-descriptor';

export interface SyncSatelliteInput {
  satellite: SatelliteRecord;
  corePath: string;
  dryRun?: boolean;
  /** Glob-like patterns to resolve from corePath. Defaults to rulesets/, reference/core/ADR-*.md, .evolith.yaml */
  filesToSync?: string[];
}

export interface SyncedFile {
  path: string;
  action: 'created' | 'updated' | 'skipped';
  sha?: string;
}

export interface SyncSatelliteOutput {
  success: boolean;
  satellite: SatelliteRecord;
  syncedFiles: SyncedFile[];
  skippedFiles: SyncedFile[];
  dryRun: boolean;
  outputEnvelope: {
    success: boolean;
    data: {
      syncedFiles: SyncedFile[];
      skippedFiles: SyncedFile[];
      dryRun: boolean;
    };
    meta: {
      requestId: string;
      timestamp: string;
      version: string;
    };
  };
}

const DEFAULT_PATTERNS = ['rulesets/', 'reference/core/ADR-*.md', '.evolith.yaml'];

/**
 * Resolve a list of file paths from corePath matching the given patterns.
 * Patterns ending with '/' are treated as directories (all files recursively).
 * Patterns containing '*' are treated as glob-like prefix+suffix matches.
 * Plain paths are matched literally.
 */
function resolveFilePaths(corePath: string, patterns: string[]): string[] {
  const results: string[] = [];

  for (const pattern of patterns) {
    if (pattern.endsWith('/')) {
      // Directory pattern — collect all files recursively
      const dirPath = path.join(corePath, pattern);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const files = walkDir(dirPath);
        for (const f of files) {
          results.push(path.relative(corePath, f));
        }
      }
    } else if (pattern.includes('*')) {
      // Simple glob — split on '*' and match prefix/suffix in parent dir
      const dirPart = path.dirname(pattern);
      const filePart = path.basename(pattern);
      const [prefix, suffix] = filePart.split('*');
      const dirPath = path.join(corePath, dirPart);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          if (entry.startsWith(prefix) && entry.endsWith(suffix)) {
            results.push(path.join(dirPart, entry));
          }
        }
      }
    } else {
      // Literal path
      const filePath = path.join(corePath, pattern);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        results.push(pattern);
      }
    }
  }

  return [...new Set(results)];
}

function walkDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * ADR-0109: destination path for a synced file inside the satellite repo. For a
 * workspace project record (`subpath` present, not repo-root) the file lands
 * under the project's subpath so N projects sharing one repo stay isolated;
 * a repo-root satellite (no subpath) pushes to the repo root unchanged.
 */
function destinationPath(satellite: SatelliteRecord, relativePath: string): string {
  const sub = satellite.subpath;
  if (!sub || sub === '.' || sub === '') return relativePath;
  return path.posix.join(sub.replace(/\\/g, '/').replace(/\/+$/, ''), relativePath);
}

/**
 * ADR-0109: expand a workspace root record into one record per declared project
 * (each pinned to its `subpath`), given a parsed `evolith.workspace.yaml`.
 * Returns [] when the document is not a workspace descriptor, so callers keep
 * treating the repo as a single repo-root satellite.
 */
export function enumerateSyncTargets(rootRecord: SatelliteRecord, workspaceDoc: unknown): SatelliteRecord[] {
  return enumerateWorkspaceProjects(workspaceDoc).map((project) => ({
    ...rootRecord,
    name: project.name,
    subpath: project.path,
  }));
}

function extractOwnerRepo(satellite: SatelliteRecord): { owner: string; repo: string } {
  // Try repoUrl first, fall back to owner field + name
  try {
    const url = new URL(satellite.repoUrl);
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch {
    // ignore parse errors
  }
  return { owner: satellite.owner, repo: satellite.name };
}

@Injectable()
export class SyncSatelliteUseCase {
  constructor(
    private readonly githubClient?: IGitHubApiClient,
    private readonly logger?: ILogger,
  ) {}

  async execute(input: SyncSatelliteInput): Promise<SyncSatelliteOutput> {
    const { satellite, corePath, dryRun = false, filesToSync = DEFAULT_PATTERNS } = input;

    this.logger?.info('SyncSatelliteUseCase: starting', JSON.stringify({ satelliteId: satellite.id, dryRun }));

    const resolvedFiles = resolveFilePaths(corePath, filesToSync);

    this.logger?.info('SyncSatelliteUseCase: resolved files', JSON.stringify({ count: resolvedFiles.length, resolvedFiles }));

    const syncedFiles: SyncedFile[] = [];
    const skippedFiles: SyncedFile[] = [];
    let success = true;

    const { owner, repo } = extractOwnerRepo(satellite);

    for (const relativePath of resolvedFiles) {
      const absolutePath = path.join(corePath, relativePath);

      if (!fs.existsSync(absolutePath)) {
        this.logger?.warn('SyncSatelliteUseCase: file not found, skipping', relativePath);
        skippedFiles.push({ path: relativePath, action: 'skipped' });
        continue;
      }

      if (dryRun) {
        this.logger?.debug('SyncSatelliteUseCase: dry-run, would sync', relativePath);
        syncedFiles.push({ path: relativePath, action: 'updated' });
        continue;
      }

      try {
        const content = fs.readFileSync(absolutePath);
        const base64Content = content.toString('base64');

        if (!this.githubClient) {
          this.logger?.warn('SyncSatelliteUseCase: no GitHub client, skipping push', relativePath);
          skippedFiles.push({ path: relativePath, action: 'skipped' });
          continue;
        }

        const destPath = destinationPath(satellite, relativePath);
        await this.githubClient.pushFile(owner, repo, {
          path: destPath,
          content: base64Content,
          message: 'chore(evolith-sync): propagate standard',
        });

        syncedFiles.push({ path: destPath, action: 'updated' });
        this.logger?.info('SyncSatelliteUseCase: pushed file', relativePath);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger?.error('SyncSatelliteUseCase: failed to push file', JSON.stringify({ relativePath, message }));
        skippedFiles.push({ path: relativePath, action: 'skipped' });
        success = false;
      }
    }

    const meta = {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return {
      success,
      satellite,
      syncedFiles,
      skippedFiles,
      dryRun,
      outputEnvelope: {
        success,
        data: { syncedFiles, skippedFiles, dryRun },
        meta,
      },
    };
  }
}
