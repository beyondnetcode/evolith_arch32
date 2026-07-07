import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';

/**
 * Guard test: the ABAC classification and the registered tool surface must never
 * drift. Every tool the DI graph registers has to be classifiable by the native
 * ABAC evaluator, otherwise it would be denied with ABAC-03 ("Unknown tool ...
 * not in any known classification") before OPA ever runs — the exact defect this
 * suite exists to prevent from regressing.
 */
describe('ABAC classification coverage (full DI graph)', () => {
  let registry: ToolRegistryService;
  const abac = new AbacEvaluator();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registry = moduleRef.get(ToolRegistryService);
  });

  it('classifies EVERY registered tool (no ABAC-03 for a real tool)', () => {
    const registeredNames = registry.listSchemas().map((s) => s.name);
    expect(registeredNames.length).toBeGreaterThan(0);

    const unclassified = registeredNames.filter((name) => abac.classifyTool(name) === undefined);
    expect(unclassified).toEqual([]);
  });

  it('every registered tool has an EXPLICIT classification entry (not just a heuristic match)', () => {
    const registeredNames = registry.listSchemas().map((s) => s.name);
    const explicitlyClassified = new Set(AbacEvaluator.classifiedToolNames());

    const missingExplicit = registeredNames.filter((name) => !explicitlyClassified.has(name));
    expect(missingExplicit).toEqual([]);
  });

  it('native evaluation never returns ABAC-03 for a registered tool', () => {
    const registeredNames = registry.listSchemas().map((s) => s.name);
    for (const name of registeredNames) {
      const decision = abac.evaluateNative({
        user: { id: 'u1', roles: ['architect'], tenant: 't1' },
        tool_name: name,
        resource_domain: 'mcp-server',
        environment: 'development',
      });
      const abac03 = decision.violations.find((v) => v.id === 'ABAC-03');
      expect(abac03).toBeUndefined();
    }
  });
});
