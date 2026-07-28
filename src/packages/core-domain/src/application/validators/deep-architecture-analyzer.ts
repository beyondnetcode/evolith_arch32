import * as path from 'path';
import * as fs from 'fs-extra';
import { ArchitectureDepth, ImportNode } from './architecture/types';
import { detectContext, detectLayer, extractImports, findSourceFiles } from './architecture/import-graph';
import {
  DetectorOptions,
  calculateCouplingMetrics, detectContextViolations, detectDependencyInversionIssues, detectLayerViolations,
} from './architecture/detectors';

export {
  ImportNode, LayerViolation, ContextViolation, ArchitectureDepth,
  CouplingMetrics, DependencyInversionIssue, SignalProvenance,
} from './architecture/types';
export type { DetectorOptions } from './architecture/detectors';
export type {
  Admissibility, AdmissibilityPolicy, SignalCalibration, SignalDeterminism,
} from './architecture/signal-admissibility';

export class DeepArchitectureAnalyzer {
  private importGraph: Map<string, ImportNode> = new Map();
  private baseDir: string;
  /**
   * GT-584 — a host that has MEASURED these detectors can declare the rates
   * here and let them block again. Absent, every finding is probabilistic and
   * uncalibrated, so it is reported as advisory rather than blocking a merge.
   */
  private readonly options?: DetectorOptions;

  constructor(baseDir: string, options?: DetectorOptions) {
    this.baseDir = baseDir;
    this.options = options;
  }

  async analyze(): Promise<ArchitectureDepth> {
    await this.buildImportGraph();
    return {
      layerViolations: detectLayerViolations(this.importGraph, this.options),
      contextViolations: detectContextViolations(this.importGraph, this.options),
      couplingMetrics: calculateCouplingMetrics(this.importGraph),
      dependencyInversionIssues: detectDependencyInversionIssues(this.importGraph, this.options),
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
