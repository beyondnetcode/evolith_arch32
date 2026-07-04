/**
 * InMemoryHarnessAdapter — a STUB {@link IHarnessPort} so the runtime works with
 * no real `.harness` checkout (design rule #5) and so tests are deterministic.
 *
 * It ships a small set of simulated capabilities that mirror real `.harness`
 * tools (gate validator, OPA audit, trace emitter, ADR validator) and returns
 * the conventional `{ status, findings, missing_artifacts, recommendations }`
 * JSON shape the result-assembler understands. The REAL executor is
 * {@link HarnessProcessAdapter}, which spawns the actual scripts.
 */

import type {
  HarnessExecutionRequest,
  HarnessExecutionResult,
  IHarnessPort,
} from '../../domain/ports/harness.port';
import type { HarnessCapability } from '../../domain/contracts/capability';

type Handler = (
  args: Readonly<Record<string, unknown>>,
  req: HarnessExecutionRequest,
) => Record<string, unknown>;

interface Sim {
  readonly capability: HarnessCapability;
  readonly handler: Handler;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

/** Built-in simulated capabilities. */
const SIMS: readonly Sim[] = [
  {
    capability: {
      name: 'sdlc-phase-gate-validator',
      type: 'validator',
      description: 'Validate a phase/gate by comparing required vs presented artifacts.',
      entry: '.harness/playbooks/sdlc-phase-gate-validator.mjs',
      permissions: ['read:repo', 'run:validator'],
      requiresApproval: false,
      emitsTrace: true,
      requiresPolicy: true,
    },
    handler: (args) => {
      const required = asStringArray(args.requiredArtifacts);
      const present = new Set(asStringArray(args.presentArtifacts));
      const missing = required.filter((a) => !present.has(a));
      return {
        status: missing.length > 0 ? 'blocked' : 'passed',
        gate: args.gate ?? null,
        missing_artifacts: missing,
        findings: missing.map((a) => ({
          id: `missing:${a}`,
          severity: 'error',
          message: `Required artifact '${a}' is missing for gate '${String(args.gate ?? 'unknown')}'.`,
        })),
        recommendations:
          missing.length > 0
            ? [`Produce the missing artifact(s): ${missing.join(', ')} before requesting the gate again.`]
            : [],
      };
    },
  },
  {
    capability: {
      name: 'opa-audit',
      type: 'audit',
      description: 'Run an OPA/ruleset audit over a subject.',
      entry: '.harness/bin/opa',
      permissions: ['read:repo', 'run:audit'],
      requiresApproval: false,
      emitsTrace: true,
      requiresPolicy: false,
    },
    handler: (args) => {
      const violations = asStringArray(args.expectedViolations);
      return {
        status: violations.length > 0 ? 'warning' : 'passed',
        findings: violations.map((v, i) => ({
          id: `opa-${i}`,
          severity: 'warning',
          message: v,
          ruleRef: 'opa',
        })),
      };
    },
  },
  {
    capability: {
      name: 'adr-architecture-validator',
      type: 'validator',
      description: 'Validate an ADR against architecture rules.',
      entry: '.harness/scripts/skills/adr-freshness-monitor.mjs',
      permissions: ['read:repo', 'run:validator'],
      requiresApproval: false,
      emitsTrace: true,
      requiresPolicy: true,
    },
    handler: (args) => ({
      status: 'passed',
      adr: args.adr ?? null,
      findings: [],
    }),
  },
  {
    capability: {
      name: 'emit-trace',
      type: 'script',
      description: 'No-op trace emitter (the runtime publishes to Tracker itself).',
      permissions: ['write:trace'],
      requiresApproval: false,
      emitsTrace: true,
      requiresPolicy: false,
    },
    handler: () => ({ status: 'passed' }),
  },
];

export class InMemoryHarnessAdapter implements IHarnessPort {
  private readonly sims = new Map<string, Sim>();

  constructor(extra: readonly Sim[] = []) {
    for (const sim of [...SIMS, ...extra]) this.sims.set(sim.capability.name, sim);
  }

  async discover(): Promise<readonly HarnessCapability[]> {
    return [...this.sims.values()].map((s) => s.capability);
  }

  async describe(capability: string): Promise<HarnessCapability | undefined> {
    return this.sims.get(capability)?.capability;
  }

  async execute(request: HarnessExecutionRequest): Promise<HarnessExecutionResult> {
    const sim = this.sims.get(request.capability);
    if (!sim) {
      return {
        ok: false,
        capability: request.capability,
        exitCode: 127,
        stderr: `Unknown harness capability '${request.capability}'.`,
        data: { status: 'error', findings: [`Unknown harness capability '${request.capability}'.`] },
      };
    }
    if (request.dryRun) {
      return { ok: true, capability: request.capability, data: { status: 'passed', dryRun: true } };
    }
    const data = sim.handler(request.args ?? {}, request);
    const ok = data.status !== 'blocked' && data.status !== 'error';
    return { ok, capability: request.capability, exitCode: ok ? 0 : 1, data };
  }
}
