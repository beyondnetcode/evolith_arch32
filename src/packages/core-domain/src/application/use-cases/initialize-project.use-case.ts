import * as path from 'path';
import { ICatalogLoader, IFileSystem } from '../../domain/interfaces';
import { IPlatformProviders } from '../ports/platform-detection.port';
import { InitProjectInput, InitProjectResult } from '../services/use-case.types';
import { ProjectScaffolderService } from '../services/project-scaffolder.service';
import { recordScaffoldedFiles, SCAFFOLD_MANIFEST_RELATIVE_PATH, ScaffoldedFile } from '../upgrade/scaffold-manifest';

/**
 * The project name becomes the directory under `cwd` (and a path prefix on every
 * artifact), so it has to be exactly one path segment: no separators, no `.`/`..`,
 * no leading dash. Same alphabet npm accepts for an unscoped package name.
 */
const PROJECT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class InitializeProjectUseCase {
  private readonly fs: IFileSystem;
  private readonly catalogLoader: ICatalogLoader;
  private readonly projectScaffolder: ProjectScaffolderService;

  constructor(fs: IFileSystem, catalogLoader: ICatalogLoader, platformProviders?: IPlatformProviders) {
    this.fs = fs;
    this.catalogLoader = catalogLoader;
    this.projectScaffolder = new ProjectScaffolderService(fs, platformProviders);
  }

  async execute(input: InitProjectInput, cwd: string): Promise<InitProjectResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const artifacts: string[] = [];

    try {
      const name = input.name;
      // The regex already excludes separators and dot-segments; the two explicit
      // checks restate the same fact in the form CodeQL models as a path sanitizer
      // (no `..`, not absolute), so `${cwd}/${name}` reads as contained downstream.
      if (
        typeof name !== 'string' ||
        !PROJECT_NAME.test(name) ||
        name.includes('..') ||
        path.isAbsolute(name)
      ) {
        errors.push(
          `Project name "${name}" is not a valid directory name: use letters, digits, ".", "-" or "_" (max 128 chars, cannot start with "." or "-")`,
        );
        return { success: false, artifacts, warnings, errors };
      }

      const runtimes = this.catalogLoader.loadRuntimeCatalog();
      const runtime = runtimes.find((r: any) => (r as any).id === input.runtime);
      if (!runtime) {
        errors.push(`Runtime ${input.runtime} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      const monorepos = this.catalogLoader.getMonorepoOptions();
      const monorepo = monorepos.find((m: any) => (m as any).id === input.monorepo);
      if (!monorepo) {
        errors.push(`Monorepo ${input.monorepo} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      const architectures = this.catalogLoader.getArchitecturePatterns();
      const architecture = architectures.find((a: any) => (a as any).id === input.architecture);
      if (!architecture) {
        errors.push(`Architecture ${input.architecture} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      // The guard above sanitises the local `name`, not the `name` field inside
      // `input`: CodeQL tracks the object's field separately, and the scaffolder
      // reads `input.name` again to name files (`${projectDir}/${input.name}.csproj`).
      // Rebuilding the input from the checked value is what makes every downstream
      // read provably the same string the guard accepted — alert #226 on
      // node-filesystem.provider.ts:50 was exactly that second read.
      const safeInput: InitProjectInput = { ...input, name };
      const projectDir = `${cwd}/${name}`;
      await this.fs.ensureDir(projectDir);

      await this.projectScaffolder.scaffoldEvolithYaml(safeInput, projectDir);
      artifacts.push(`${name}/evolith.yaml`);

      await this.projectScaffolder.scaffoldReadme(safeInput, projectDir);
      artifacts.push(`${name}/README.md`, `${name}/README.es.md`);

      await this.projectScaffolder.scaffoldByRuntime(safeInput, projectDir);
      artifacts.push(`${name}/package.json`);

      // GIT-08 — after the runtime scaffold, so the commitlint devDependencies
      // merge into the package.json that scaffold just wrote rather than racing it.
      const commitArtifacts = await this.projectScaffolder.scaffoldCommitConventions(safeInput, projectDir);
      for (const artifact of commitArtifacts) {
        const qualified = `${name}/${artifact}`;
        if (!artifacts.includes(qualified)) artifacts.push(qualified);
      }
      if (!input.features.includes('hooks')) {
        warnings.push(
          'Conventional Commits are configured (commitlint.config.mjs) but nothing runs them: '
          + 'the `hooks` feature was not selected, so no commit-msg hook was installed. '
          + 'Wire commitlint into CI or re-run with --features hooks.',
        );
      }

      if (input.features.includes('adr')) {
        await this.fs.ensureDir(`${projectDir}/reference/architecture/adrs`);
        await this.fs.writeJson(`${projectDir}/reference/architecture/adrs/adr-matrix.json`, { adrs: [] });
        artifacts.push(`${name}/reference/architecture/adrs/adr-matrix.json`);
      }

      if (input.features.includes('hooks')) {
        await this.fs.ensureDir(`${projectDir}/.husky`);
        await this.fs.writeFile(`${projectDir}/.husky/pre-commit`, '#!/bin/sh\nevolution validate --pre-commit\n');
        artifacts.push(`${name}/.husky/pre-commit`);
      }

      if (input.features.includes('acl')) {
        await this.fs.ensureDir(`${projectDir}/rulesets/acl`);
        await this.fs.writeJson(`${projectDir}/rulesets/acl/anti-corruption-layer.rules.json`, { version: '1.0.0', principles: [] });
        artifacts.push(`${name}/rulesets/acl/anti-corruption-layer.rules.json`);
      }

      const platformCheck = await this.projectScaffolder.checkRuntimePlatform(input.runtime);
      if (!platformCheck.available) {
        warnings.push(`Platform ${input.runtime} not detected. ${platformCheck.installHint || ''}`);
      }

      // GT-673: fingerprint every file this scaffold wrote, so a later
      // `evolith upgrade` can tell the tenant's edits from upstream changes.
      // Read back rather than hashed on the way out: package.json is written
      // twice above, and the manifest must record what is on disk.
      await this.recordScaffoldManifest(name, projectDir, artifacts);
      artifacts.push(`${name}/${SCAFFOLD_MANIFEST_RELATIVE_PATH}`);

      return { success: true, artifacts, warnings, errors };
    } catch (error: unknown) {
      const err = error as { message?: string };
      errors.push(err.message || 'Unknown error');
      return { success: false, artifacts, warnings, errors };
    }
  }

  /**
   * The Core version recorded is the one the scaffolded `evolith.yaml` pins in
   * `coreRef.version` — the same value `upgrade` later reads as the satellite's
   * current version — so the manifest and the config never disagree.
   */
  private async recordScaffoldManifest(name: string, projectDir: string, artifacts: readonly string[]): Promise<void> {
    const files: ScaffoldedFile[] = [];
    for (const artifact of artifacts) {
      const relativePath = artifact.startsWith(`${name}/`) ? artifact.slice(name.length + 1) : artifact;
      const absolutePath = `${projectDir}/${relativePath}`;
      if (!await this.fs.exists(absolutePath)) continue;
      files.push({ relativePath, content: await this.fs.readFile(absolutePath) });
    }
    const config = await this.fs.readJson<{ coreRef?: { version?: string } }>(`${projectDir}/evolith.yaml`);
    await recordScaffoldedFiles(this.fs, projectDir, config.coreRef?.version ?? 'unknown', files);
  }
}
