import * as path from 'path';
import * as fs from 'fs-extra';
import { ArchitectureDepth, ImportNode } from './architecture/types';
import { detectContext, detectLayer, extractImports, findSourceFiles } from './architecture/import-graph';
import {
  calculateCouplingMetrics, detectContextViolations, detectDependencyInversionIssues, detectLayerViolations,
} from './architecture/detectors';

export {
  ImportNode, LayerViolation, ContextViolation, ArchitectureDepth,
  CouplingMetrics, DependencyInversionIssue,
} from './architecture/types';

export class DeepArchitectureAnalyzer {
  private importGraph: Map<string, ImportNode> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async analyze(): Promise<ArchitectureDepth> {
    await this.buildImportGraph();
    return {
      layerViolations: detectLayerViolations(this.importGraph),
      contextViolations: detectContextViolations(this.importGraph),
      couplingMetrics: calculateCouplingMetrics(this.importGraph),
      dependencyInversionIssues: detectDependencyInversionIssues(this.importGraph),
    };
  }

  private async buildImportGraph(): Promise<void> {
    const srcDir = path.join(this.baseDir, 'src');
    if (!(await fs.pathExists(srcDir))) return;
    const files = await findSourceFiles(srcDir);
    for (const file of files) {
      const imports = await extractImports(file);
      const relativeFile = path.relative(this.baseDir, file);
      this.importGraph.set(relativeFile, {
        file: relativeFile,
        imports,
        layer: detectLayer(relativeFile),
        context: detectContext(relativeFile),
      });
    }
  }
}
