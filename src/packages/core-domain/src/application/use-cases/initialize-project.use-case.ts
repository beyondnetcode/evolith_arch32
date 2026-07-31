import { ICatalogLoader, IFileSystem } from '../../domain/interfaces';
import { IPlatformProviders } from '../ports/platform-detection.port';
import { InitProjectInput, InitProjectResult } from '../services/use-case.types';
import { ProjectScaffolderService } from '../services/project-scaffolder.service';

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

      const projectDir = `${cwd}/${input.name}`;
      await this.fs.ensureDir(projectDir);

      await this.projectScaffolder.scaffoldEvolithYaml(input, projectDir);
      artifacts.push(`${input.name}/evolith.yaml`);

      await this.projectScaffolder.scaffoldReadme(input, projectDir);
      artifacts.push(`${input.name}/README.md`, `${input.name}/README.es.md`);

      await this.projectScaffolder.scaffoldByRuntime(input, projectDir);
      artifacts.push(`${input.name}/package.json`);

      // GIT-08 — after the runtime scaffold, so the commitlint devDependencies
      // merge into the package.json that scaffold just wrote rather than racing it.
      const commitArtifacts = await this.projectScaffolder.scaffoldCommitConventions(input, projectDir);
      for (const artifact of commitArtifacts) {
        const qualified = `${input.name}/${artifact}`;
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
        artifacts.push(`${input.name}/reference/architecture/adrs/adr-matrix.json`);
      }

      if (input.features.includes('hooks')) {
        await this.fs.ensureDir(`${projectDir}/.husky`);
        await this.fs.writeFile(`${projectDir}/.husky/pre-commit`, '#!/bin/sh\nevolution validate --pre-commit\n');
        artifacts.push(`${input.name}/.husky/pre-commit`);
      }

      if (input.features.includes('acl')) {
        await this.fs.ensureDir(`${projectDir}/rulesets/acl`);
        await this.fs.writeJson(`${projectDir}/rulesets/acl/anti-corruption-layer.rules.json`, { version: '1.0.0', principles: [] });
        artifacts.push(`${input.name}/rulesets/acl/anti-corruption-layer.rules.json`);
      }

      const platformCheck = await this.projectScaffolder.checkRuntimePlatform(input.runtime);
      if (!platformCheck.available) {
        warnings.push(`Platform ${input.runtime} not detected. ${platformCheck.installHint || ''}`);
      }

      return { success: true, artifacts, warnings, errors };
    } catch (error: unknown) {
      const err = error as { message?: string };
      errors.push(err.message || 'Unknown error');
      return { success: false, artifacts, warnings, errors };
    }
  }
}
