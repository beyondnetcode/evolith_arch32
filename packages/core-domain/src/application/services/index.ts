// GateResult unified onto the canonical domain value object (W-Contracts).
import type { GateResult } from '../../domain/entities';

export interface InitProjectInput {
  name: string;
  runtime: string;
  monorepo: string;
  architecture: string;
  database: string;
  apiProtocol: string;
  ciCd: string;
  observability: string;
  features: string[];
  agents: string[];
}

export interface InitProjectResult {
  success: boolean;
  artifacts: string[];
  warnings: string[];
  errors: string[];
}

export * from '../use-cases/initialize-project.use-case';
export * from '../use-cases/adopt-repo.use-case';
export * from '../use-cases/phase-transition.use-case';
export * from './topology-catalog.service';
export * from './sdlc-data-loader.service';
export * from './satellite-evaluation-pipeline.service';
export * from './catalog.service';
export * from './audit.service';
export * from './gate-registry.service';
export * from './satellite-scaffolder.service';
export * from './repo-detector.service';
export * from '../ports/repo-detection.port';

export interface PhaseTransitionResult {
  success: boolean;
  from: string;
  to: string;
  gateResults: GateResult[];
  executedTools: string[];
  warnings: string[];
  errors: string[];
}
