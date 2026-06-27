/**
 * GT-317 — Tests for ValidateWorkflowUseCase
 */

import * as path from 'path';
import { ValidateWorkflowUseCase } from './validate-workflow.use-case';
import {
  WorkflowDefinition,
  WorkflowGateDefinition,
  WorkflowPhaseDefinition,
} from '../../domain/workflow';

// Repo root — five levels up from this file's location
// src/application/use-cases/ → src/application/ → src/ → packages/core-domain/ → packages/ → evolith/
const CORE_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGate(id: string, artifacts: string[], rules: string[] = []): WorkflowGateDefinition {
  return { id, name: id, requiredArtifacts: artifacts, rules, accountableRole: 'Owner' };
}

function makePhase(
  id: string,
  order: number,
  gates: WorkflowGateDefinition[],
): WorkflowPhaseDefinition {
  return { id, name: id, order, gates };
}

/** Builds a minimal valid WorkflowDefinition with all 5 phases and their canonical gates/artifacts. */
function validDefinition(): WorkflowDefinition {
  return {
    name: 'Test Workflow',
    description: 'Full valid workflow',
    phases: [
      makePhase('f1', 1, [
        makeGate('gate-f1', [
          'PRD',
          'Discovery Canvas',
          'Technical Feasibility Canvas',
          'Ballpark Estimation',
          'MoSCoW Prioritization Matrix',
          'Build-versus-Compose Analysis',
        ], ['rulesets/opa/governance.rego']),
      ]),
      makePhase('f2', 2, [
        makeGate('gate-f2', [
          'ADR Registry',
          'Functional Stories',
          'Reference Blueprint Alignment',
          'Simplicity Checklist Phase 1',
          'Bounded Context Map',
        ], ['rulesets/opa/governance.rego']),
      ]),
      makePhase('f3', 3, [
        makeGate('gate-f3', [
          'Technical Stories',
          'CI Pipeline',
          'Definition of Done Checklist',
          'Documentation Delta',
          'Coverage Report',
        ], ['rulesets/opa/governance.rego']),
      ]),
      makePhase('f4', 4, [
        makeGate('gate-f4', [
          'Test Summary Report',
          'Acceptance Validation',
          'Security Scan Report',
          'Integration Evidence',
          'Pyramid Distribution',
        ], ['rulesets/opa/governance.rego']),
      ]),
      makePhase('f5', 5, [
        makeGate('gate-f5', [
          'Release Notes',
          'Observability Validation',
          'Rollback Procedure',
          'On-Call Handoff',
          'Deployment Evidence',
        ], ['rulesets/opa/governance.rego']),
      ]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ValidateWorkflowUseCase', () => {
  let useCase: ValidateWorkflowUseCase;

  beforeEach(() => {
    useCase = new ValidateWorkflowUseCase(CORE_PATH);
  });

  it('should pass a fully valid workflow definition', () => {
    const result = useCase.execute(validDefinition());
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when a mandatory phase is missing', () => {
    const def = validDefinition();
    def.phases = def.phases.filter(p => p.id !== 'f3');

    const result = useCase.execute(def);
    expect(result.valid).toBe(false);
    expect(result.violations.map(v => v.code)).toContain('MISSING_MANDATORY_PHASE');
    expect(result.violations.find(v => v.phase === 'f3')).toBeDefined();
  });

  it('should fail when all mandatory phases are missing', () => {
    const def: WorkflowDefinition = { name: 'Empty', description: '', phases: [] };
    const result = useCase.execute(def);
    expect(result.valid).toBe(false);
    expect(result.violations.filter(v => v.code === 'MISSING_MANDATORY_PHASE')).toHaveLength(5);
  });

  it('should fail when a gate has no required artifacts', () => {
    const def = validDefinition();
    def.phases.find(p => p.id === 'f2')!.gates[0].requiredArtifacts = [];

    const result = useCase.execute(def);
    expect(result.valid).toBe(false);
    expect(
      result.violations.some(v => v.code === 'GATE_NO_ARTIFACTS' && v.gate === 'gate-f2'),
    ).toBe(true);
  });

  it('should fail when a non-omittable artifact is missing from a gate', () => {
    const def = validDefinition();
    const gate = def.phases.find(p => p.id === 'f1')!.gates[0];
    gate.requiredArtifacts = gate.requiredArtifacts.filter(a => a !== 'PRD');

    const result = useCase.execute(def);
    expect(result.valid).toBe(false);
    expect(
      result.violations.some(
        v =>
          v.code === 'NON_OMITTABLE_ARTIFACT_MISSING' &&
          v.gate === 'gate-f1' &&
          v.artifact === 'PRD',
      ),
    ).toBe(true);
  });

  it('should fail when an OPA rule does not exist on disk', () => {
    const def = validDefinition();
    def.phases[0].gates[0].rules = ['rulesets/opa/non-existent-rule.rego'];

    const result = useCase.execute(def);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.code === 'OPA_RULE_NOT_FOUND')).toBe(true);
  });
});
