import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ToolRegistryService } from '../mcp/tool-registry.service';

/**
 * Integration test: boot the full NestJS graph and assert every ported tool is
 * registered. This exercises the real DI wiring (domain factory, MCP_TOOLS
 * aggregation, tool-group factories).
 */
describe('Tool registration (full DI graph)', () => {
  let registry: ToolRegistryService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registry = moduleRef.get(ToolRegistryService);
  });

  it('registers exactly the expected tools with no duplicates', () => {
    const names = registry.listSchemas().map((s) => s.name);

    // Exhaustive, authoritative set of every tool registered by tools.module.ts
    // (via the MCP_TOOLS provider). Keep in sync with that module: adding a tool
    // here without registering it — or registering one without listing it here —
    // must fail this guard (set equality below), never pass silently.
    const expected = [
      'evolith-adr-create',
      'evolith-adr-get',
      'evolith-adr-list',
      'evolith-adr-matrix',
      'evolith-adr-update',
      'evolith-agent-install',
      'evolith-agent-list',
      'evolith-agent-remove',
      'evolith-agent-run',
      'evolith-agent-upgrade',
      'evolith-agent-validate',
      'evolith-architecture-validate',
      'evolith-auto-fix',
      'evolith-composable-validate',
      'evolith-config-get',
      'evolith-config-set',
      'evolith-docs-scaffold',
      'evolith-dora-metrics',
      'evolith-drift-detect',
      'evolith-evaluate',
      'evolith-fixtures',
      'evolith-gate-evaluate',
      'evolith-init-batch',
      'evolith-metrics',
      'evolith-moscow-create',
      'evolith-moscow-list',
      'evolith-moscow-load',
      'evolith-moscow-remove',
      'evolith-moscow-report',
      'evolith-moscow-update',
      'evolith-moscow-validate',
      'evolith-phase-advance',
      'evolith-phase-artifacts-evaluate',
      'evolith-satellite-adopt',
      'evolith-satellite-create',
      'evolith-satellite-list',
      'evolith-satellite-status',
      'evolith-scaffold',
      'evolith-sdlc-generate',
      'evolith-sdlc-handoff',
      'evolith-sdlc-status',
      'evolith-topology-get',
      'evolith-topology-list',
      'evolith-topology-recommend',
      'evolith-upgrade-apply',
      'evolith-upgrade-plan',
      'evolith-validate',
    ];

    // No duplicate registrations.
    expect(new Set(names).size).toBe(names.length);

    // Surface a precise diff before the set-equality assertion: any tool added
    // to the module but not listed here shows up in `extra`; any listed tool no
    // longer registered shows up in `missing`.
    const missing = expected.filter((n) => !names.includes(n));
    const extra = names.filter((n) => !expected.includes(n));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });

    // Set equality: catches BOTH an added and a removed tool.
    expect(new Set(names)).toEqual(new Set(expected));
  });

  it('flags mutative tools', () => {
    expect(registry.get('evolith-config-set')?.mutative).toBe(true);
    expect(registry.get('evolith-agent-install')?.mutative).toBe(true);
    expect(registry.get('evolith-sdlc-handoff')?.mutative).toBe(true);
    expect(registry.get('evolith-auto-fix')?.mutative).toBe(true);
    expect(registry.get('evolith-validate')?.mutative).toBeFalsy();
  });
});
