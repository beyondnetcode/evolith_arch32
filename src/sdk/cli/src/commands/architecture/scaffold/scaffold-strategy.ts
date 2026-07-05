export type ScaffoldTarget = 'modular-monolith' | 'distributed-modules' | 'microservices';

export interface ScaffoldOptions {
  target: ScaffoldTarget;
  dryRun: boolean;
  outputDir: string;
}

export interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  errors: string[];
}

export class ScaffoldStrategy {
  async execute(options: ScaffoldOptions): Promise<ScaffoldResult> {
    if (options.dryRun) {
      return { success: true, filesCreated: [], errors: [] };
    }
    return { success: true, filesCreated: [options.outputDir], errors: [] };
  }

  getRequiredFiles(target: ScaffoldTarget): string[] {
    const base = ['evolith.yaml', 'package.json', 'src/'];
    if (target === 'distributed-modules' || target === 'microservices') {
      return [...base, 'contracts/', 'topology.manifest.json'];
    }
    return base;
  }
}
