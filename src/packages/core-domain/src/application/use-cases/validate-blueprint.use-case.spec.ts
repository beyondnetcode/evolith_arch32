/**
 * Tests for GT-325 — Blueprint entity, builder, and validation pipeline.
 */

import * as path from 'path';
import { BlueprintBuilder } from '../../domain/entities/blueprint';
import { ArtifactState } from '../../domain/lifecycle/artifact-state-machine';
import { Verdict } from '../../domain/verdict/verdict';
import { Role } from '../../domain/rbac/role';
import { ValidateBlueprintUseCase, BlueprintValidationContext } from './validate-blueprint.use-case';
import type { IDomainEventBus } from '../ports/event-bus.port';
import type { DomainEvent } from '../../domain/events/domain-event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * `src/` root — the corePath base where the rulesets tree lives
 * (`src/rulesets/topologies`, `src/rulesets/opa`, …).
 */
const SRC_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

/** True repository root (one level above `src/`). */
const REPO_ROOT = path.resolve(SRC_ROOT, '..');

/**
 * Real SDLC gate registry — the `gate-f*.json` data files live at the repo-root
 * `reference/governance/sdlc/gates/` (authored under GT-461), NOT under `src/`.
 */
const SDLC_GATE_DIR = path.join(REPO_ROOT, 'reference', 'governance', 'sdlc', 'gates');

function makeContext(overrides: Partial<BlueprintValidationContext> = {}): BlueprintValidationContext {
  return {
    tenantId: 'tenant-test',
    actorRoles: [Role.ARCHITECT],
    corePath: SRC_ROOT,
    sdlcPath: SDLC_GATE_DIR,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BlueprintBuilder tests
// ---------------------------------------------------------------------------

describe('BlueprintBuilder', () => {
  it('builds a valid blueprint with all required fields', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addRuleset('rulesets/governance')
      .addGate('gate-f1')
      .addRequiredArtifact('PRD')
      .build();

    expect(bp.id).toBeTruthy();
    expect(bp.tenantId).toBe('t-1');
    expect(bp.topology).toBe('event-driven');
    expect(bp.phase).toBe('f1');
    expect(bp.state).toBe(ArtifactState.DRAFT);
    expect(bp.content.rulesets).toContain('rulesets/governance');
    expect(bp.content.gateIds).toContain('gate-f1');
    expect(bp.content.requiredArtifacts).toContain('PRD');
    expect(bp.verdictHistory).toHaveLength(0);
    expect(bp.createdAt).toBeTruthy();
  });

  it('allows setting a custom id and version', () => {
    const bp = new BlueprintBuilder()
      .setId('bp-custom-42')
      .setTenantId('t-1')
      .setTopology('serverless')
      .setPhase('f2')
      .setVersion('2.1.0')
      .build();

    expect(bp.id).toBe('bp-custom-42');
    expect(bp.version).toBe('2.1.0');
  });

  it('adds custom policies', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('serverless')
      .setPhase('f1')
      .addCustomPolicy('rulesets/opa/rbac/gate-role-enforcement.rego')
      .build();

    expect(bp.content.customPolicies).toContain('rulesets/opa/rbac/gate-role-enforcement.rego');
  });

  it('throws when tenantId is missing', () => {
    expect(() =>
      new BlueprintBuilder().setTopology('serverless').setPhase('f1').build(),
    ).toThrow('tenantId is required');
  });

  it('throws when topology is missing', () => {
    expect(() =>
      new BlueprintBuilder().setTenantId('t-1').setPhase('f1').build(),
    ).toThrow('topology is required');
  });

  it('throws when phase is missing', () => {
    expect(() =>
      new BlueprintBuilder().setTenantId('t-1').setTopology('serverless').build(),
    ).toThrow('phase is required');
  });
});

// ---------------------------------------------------------------------------
// ValidateBlueprintUseCase tests
// ---------------------------------------------------------------------------

describe('ValidateBlueprintUseCase', () => {
  it('passes for a well-formed blueprint with a real topology', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.PASS);
    expect(result.violations).toHaveLength(0);
    expect(result.validatedAt).toBeTruthy();
  });

  it('transitions state from DRAFT to VALIDATED on success', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .build();

    expect(bp.state).toBe(ArtifactState.DRAFT);

    new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(bp.state).toBe(ArtifactState.VALIDATED);
  });

  it('records a verdict in verdictHistory', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .build();

    new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(bp.verdictHistory).toHaveLength(1);
    expect(bp.verdictHistory[0].verdict).toBe(Verdict.PASS);
  });

  it('emits BlueprintGeneratedEvent and BlueprintValidatedEvent', async () => {
    const published: DomainEvent<unknown>[] = [];
    const bus: IDomainEventBus = {
      publish: async (e) => { published.push(e as DomainEvent<unknown>); },
      subscribe: () => () => {},
    };

    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .build();

    new ValidateBlueprintUseCase(bus).execute(bp, makeContext());

    // Allow async fire-and-forget publishes to flush
    await new Promise(resolve => setImmediate(resolve));

    const types = published.map(e => e.eventType);
    expect(types).toContain('blueprint.generated');
    expect(types).toContain('blueprint.validated');
  });

  it('produces TOPOLOGY_NOT_FOUND violation for a missing topology', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('nonexistent-topology-xyz')
      .setPhase('f1')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.FAIL);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('TOPOLOGY_NOT_FOUND');
  });

  it('transitions state to REJECTED when topology is missing', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('nonexistent-topology-xyz')
      .setPhase('f1')
      .build();

    new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(bp.state).toBe(ArtifactState.REJECTED);
  });

  it('produces RULESET_NOT_FOUND violation for a missing ruleset', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addRuleset('rulesets/does-not-exist-xyz')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.FAIL);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('RULESET_NOT_FOUND');
  });

  it('produces GATE_NOT_FOUND violation for an unknown gate', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f99-nonexistent')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.FAIL);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('GATE_NOT_FOUND');
  });

  it('produces INVALID_PHASE violation for an invalid phase', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f99')
      .build();

    // Temporarily patch phase since builder validates it is non-empty but not
    // the canonical set — the use case does that check
    (bp as { phase: string }).phase = 'z99';

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.FAIL);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('INVALID_PHASE');
  });

  it('produces OPA_POLICY_NOT_FOUND for a missing custom policy', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .addCustomPolicy('rulesets/opa/nonexistent-policy.rego')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    expect(result.verdict).toBe(Verdict.FAIL);
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain('OPA_POLICY_NOT_FOUND');
  });

  it('accepts a real OPA policy that exists on disk', () => {
    const bp = new BlueprintBuilder()
      .setTenantId('t-1')
      .setTopology('event-driven')
      .setPhase('f1')
      .addGate('gate-f1')
      .addCustomPolicy('rulesets/opa/rbac/gate-role-enforcement.rego')
      .build();

    const result = new ValidateBlueprintUseCase().execute(bp, makeContext());

    // No OPA_POLICY_NOT_FOUND violation expected
    const opaCodes = result.violations
      .filter(v => v.code === 'OPA_POLICY_NOT_FOUND')
      .map(v => v.code);
    expect(opaCodes).toHaveLength(0);
  });
});
