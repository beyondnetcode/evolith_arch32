import { PhaseService } from '../../domain/services';
import { ICatalogLoader, IFileSystem } from '../../domain/interfaces';
import { IPlatformProviders } from '../ports/platform-detection.port';
import { IWebhookNotifier } from '../ports/webhook-notifier.port';
import { PlatformNotFoundError, ValidationError } from '../../domain/errors';

import { PhaseGateValidatorService, GateValidationResult } from '../../application/validators/phase-gate-validator.service';

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
export * from '../use-cases/phase-transition.use-case';
export * from './topology-catalog.service';
export * from './sdlc-data-loader.service';
export * from './satellite-evaluation-pipeline.service';

export interface GateResult {
  id: string;
  passed: boolean;
  description: string;
  required: boolean;
}

export interface PhaseTransitionResult {
  success: boolean;
  from: string;
  to: string;
  gateResults: GateResult[];
  executedTools: string[];
  warnings: string[];
  errors: string[];
}
