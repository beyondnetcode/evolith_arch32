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

  it('registers all expected tools with no duplicates', () => {
    const names = registry.listSchemas().map((s) => s.name);

    const expected = [
      'evolith-validate',
      'evolith-agent-install',
      'evolith-agent-list',
      'evolith-agent-validate',
      'evolith-agent-upgrade',
      'evolith-agent-remove',
      'evolith-architecture-validate',
      'evolith-drift-detect',
      'evolith-gate-evaluate',
      'evolith-phase-advance',
      'evolith-moscow-create',
      'evolith-moscow-load',
      'evolith-moscow-update',
      'evolith-moscow-remove',
      'evolith-moscow-list',
      'evolith-moscow-validate',
      'evolith-moscow-report',
      'evolith-sdlc-status',
      'evolith-sdlc-handoff',
      'evolith-dora-metrics',
      'evolith-auto-fix',
      'evolith-config-get',
      'evolith-config-set',
      'evolith-metrics',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it('flags mutative tools', () => {
    expect(registry.get('evolith-config-set')?.mutative).toBe(true);
    expect(registry.get('evolith-agent-install')?.mutative).toBe(true);
    expect(registry.get('evolith-sdlc-handoff')?.mutative).toBe(true);
    expect(registry.get('evolith-auto-fix')?.mutative).toBe(true);
    expect(registry.get('evolith-validate')?.mutative).toBeFalsy();
  });
});
