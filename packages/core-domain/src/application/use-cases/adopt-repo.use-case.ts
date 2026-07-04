import { IFileSystem } from '../../domain/interfaces';
import { RepoDetectionResult } from '../ports/repo-detection.port';
import { SatelliteScaffolderService, AdoptRepoInput, ScaffoldResult } from '../services/satellite-scaffolder.service';

export interface AdoptRepoResult {
  success: boolean;
  created: string[];
  skipped: string[];
  merged: string[];
  warnings: string[];
  errors: string[];
}

export class AdoptRepoUseCase {
  private readonly fs: IFileSystem;
  private readonly scaffolder: SatelliteScaffolderService;

  constructor(fs: IFileSystem) {
    this.fs = fs;
    this.scaffolder = new SatelliteScaffolderService(fs);
  }

  async execute(input: AdoptRepoInput, cwd: string): Promise<AdoptRepoResult> {
    const created: string[] = [];
    const skipped: string[] = [];
    const merged: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Generate/merge evolith.yaml
      const yamlResult = await this.scaffolder.scaffoldEvolithYaml(input, cwd);
      this.classifyResult(yamlResult, created, skipped, merged);

      // 2. Create governance directory structure
      const govDirs = await this.scaffolder.scaffoldGovernanceStructure(cwd);
      created.push(...govDirs);

      // 3. Create/enhance README
      const readmeResult = await this.scaffolder.scaffoldReadme(input, cwd);
      this.classifyResult(readmeResult, created, skipped, merged);

      // 4. Create/enhance AGENTS.md
      const agentsResult = await this.scaffolder.scaffoldAgentsMd(input, cwd);
      this.classifyResult(agentsResult, created, skipped, merged);

      // 5. Gap tracking (if adr feature enabled)
      if (input.features.includes('adr')) {
        const gapResults = await this.scaffolder.scaffoldGapTracking(cwd);
        for (const r of gapResults) this.classifyResult(r, created, skipped, merged);
      }

      // 6. Maturity assessment
      const maturityResults = await this.scaffolder.scaffoldMaturityAssessment(cwd);
      for (const r of maturityResults) this.classifyResult(r, created, skipped, merged);

      // 7. ADR matrix
      const adrResult = await this.scaffolder.scaffoldAdrMatrix(cwd);
      this.classifyResult(adrResult, created, skipped, merged);

      // 8. Git hooks
      const hookResults = await this.scaffolder.scaffoldHooks(input, cwd);
      for (const r of hookResults) this.classifyResult(r, created, skipped, merged);

      return { success: true, created, skipped, merged, warnings, errors };
    } catch (error: unknown) {
      const err = error as { message?: string };
      errors.push(err.message || 'Unknown error');
      return { success: false, created, skipped, merged, warnings, errors };
    }
  }

  private classifyResult(
    result: ScaffoldResult,
    created: string[],
    skipped: string[],
    merged: string[],
  ): void {
    switch (result.action) {
      case 'created': created.push(result.path); break;
      case 'skipped': skipped.push(result.path); break;
      case 'merged': merged.push(result.path); break;
    }
  }
}
