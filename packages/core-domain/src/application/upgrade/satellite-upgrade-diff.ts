/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem } from '../../domain/interfaces';
import { UpgradeChange } from './satellite-upgrade.types';
import { findJsonFiles } from './satellite-upgrade-fs';

export async function getSatelliteVersion(fs: IFileSystem, satellitePath: string): Promise<string> {
  const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');
  if (!await fs.exists(evolithYamlPath)) return 'unknown';
  try {
    const content = await fs.readFile(evolithYamlPath);
    const config = JSON.parse(content) as { coreRef?: { version?: string } };
    return config.coreRef?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function getCoreVersion(fs: IFileSystem, corePath: string): Promise<string> {
  const versionPath = path.join(corePath, 'package.json');
  if (!await fs.exists(versionPath)) return 'unknown';
  try {
    const pkg = await fs.readJson(versionPath) as { version?: string };
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

const BREAKING_PATTERNS = ['inheritance', 'anti-corruption', 'open-core-boundary', 'governance'];

export function isBreakingChange(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return BREAKING_PATTERNS.some(pattern => lower.includes(pattern));
}

export async function diffSatelliteVsCore(fs: IFileSystem, satellitePath: string, corePath: string): Promise<UpgradeChange[]> {
  const changes: UpgradeChange[] = [];

  await diffRulesets(fs, satellitePath, corePath, changes);
  await diffHarness(fs, satellitePath, corePath, changes);

  return changes;
}

async function diffRulesets(fs: IFileSystem, satellitePath: string, corePath: string, changes: UpgradeChange[]): Promise<void> {
  const coreRulesetsPath = path.join(corePath, 'rulesets');
  const satelliteRulesetsPath = path.join(satellitePath, 'rulesets');
  if (!await fs.exists(coreRulesetsPath)) return;

  const coreFiles = await findJsonFiles(fs, coreRulesetsPath);
  for (const coreFile of coreFiles) {
    const relativePath = path.relative(coreRulesetsPath, coreFile);
    const satelliteFile = path.join(satelliteRulesetsPath, relativePath);

    if (!await fs.exists(satelliteFile)) {
      changes.push({
        type: 'add',
        sourcePath: coreFile,
        targetPath: satelliteFile,
        description: `Add new ruleset: ${relativePath}`,
        breaking: isBreakingChange(relativePath),
      });
      continue;
    }

    const coreContent = await fs.readFile(coreFile);
    const satelliteContent = await fs.readFile(satelliteFile);
    if (coreContent !== satelliteContent) {
      changes.push({
        type: 'modify',
        sourcePath: coreFile,
        targetPath: satelliteFile,
        description: `Update ruleset: ${relativePath}`,
        breaking: isBreakingChange(relativePath),
      });
    }
  }
}

async function diffHarness(fs: IFileSystem, satellitePath: string, corePath: string, changes: UpgradeChange[]): Promise<void> {
  const coreHarnessPath = path.join(corePath, '.harness');
  const satelliteHarnessPath = path.join(satellitePath, '.harness');
  if (!await fs.exists(coreHarnessPath)) return;

  const coreHarnessFiles = await findJsonFiles(fs, coreHarnessPath);
  for (const coreFile of coreHarnessFiles) {
    const relativePath = path.relative(coreHarnessPath, coreFile);
    const satelliteFile = path.join(satelliteHarnessPath, relativePath);
    if (!await fs.exists(satelliteFile)) {
      changes.push({
        type: 'add',
        sourcePath: coreFile,
        targetPath: satelliteFile,
        description: `Add harness file: ${relativePath}`,
        breaking: false,
      });
    }
  }
}
