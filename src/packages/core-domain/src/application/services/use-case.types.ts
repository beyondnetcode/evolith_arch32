// Input/result contracts for the application use cases.
//
// These live in their own module rather than in `services/index.ts` because that
// barrel re-exports the use cases themselves: a use case importing its own input
// type from the barrel closed a runtime import cycle
// (services/index → initialize-project.use-case → services/index). The barrel
// still re-exports everything here, so the public entry point is unchanged.
//
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

export interface PhaseTransitionResult {
  success: boolean;
  from: string;
  to: string;
  gateResults: GateResult[];
  executedTools: string[];
  warnings: string[];
  errors: string[];
}
