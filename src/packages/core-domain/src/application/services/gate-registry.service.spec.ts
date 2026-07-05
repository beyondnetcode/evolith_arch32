import { GateRegistryService, GateDefinition } from './gate-registry.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';

const GATE_F1: GateDefinition = {
  id: 'gate-f1',
  name: 'Business Sign-Off',
  phase: 'f1',
  description: 'Scope frozen.',
  requiredArtifacts: [
    { artifact: 'PRD', validation: 'PRD approved', rules: ['rulesets/opa/governance.rego'] },
    { artifact: 'Discovery Canvas', validation: 'Canvas complete', rules: ['rulesets/opa/governance.rego'] },
  ],
  blockingCriteria: [{ criterion: 'Scope is ambiguous', action: 'BLOCK' }],
  accountableRole: 'Product Owner',
  waiverAuthority: 'Executive Sponsor',
};

const GATE_F2: GateDefinition = {
  id: 'gate-f2',
  name: 'Design Baseline Approved',
  phase: 'f2',
  description: 'Architecture decisions documented.',
  requiredArtifacts: [
    { artifact: 'ADR Registry', validation: 'ADRs present', rules: ['rulesets/opa/hexagonal-architecture.rego'] },
  ],
  blockingCriteria: [{ criterion: 'Undocumented decisions', action: 'BLOCK' }],
  accountableRole: 'Software Architect',
  waiverAuthority: 'Architecture Board',
};

function makeGateJson(gate: GateDefinition): string {
  return JSON.stringify({
    $schema: '../sdlc-gate.schema.json',
    id: gate.id,
    name: gate.name,
    phase: gate.phase,
    description: gate.description,
    accountableRole: gate.accountableRole,
    waiverAuthority: gate.waiverAuthority,
    requiredArtifacts: gate.requiredArtifacts,
    blockingCriteria: gate.blockingCriteria,
  });
}

const createMockFs = (gateMap: Record<string, GateDefinition>): IFileSystem => {
  const names = Object.keys(gateMap).map(id => `${id}.json`);
  return {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockImplementation((p: string) => {
      const fileName = p.split('/').pop()!.replace('.json', '');
      const gate = gateMap[fileName];
      if (gate) return Promise.resolve(makeGateJson(gate));
      return Promise.reject(new Error(`File not found: ${p}`));
    }),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue(names),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
  } as unknown as IFileSystem;
};

const createMockLogger = (): ILogger => ({
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
});

describe('GateRegistryService', () => {
  const gatesPath = '/core/reference/governance/sdlc/gates';

  describe('loadAll', () => {
    it('loads all gate-f*.json files and returns definitions in phase order', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1, 'gate-f2': GATE_F2 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const gates = await svc.loadAll();

      expect(gates).toHaveLength(2);
      expect(gates[0].id).toBe('gate-f1');
      expect(gates[1].id).toBe('gate-f2');
    });

    it('caches results — readFile is not called a second time', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      await svc.loadAll();
      await svc.loadAll();

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('skips files that fail to parse and logs a warning', async () => {
      const fs = createMockFs({});
      (fs.readdirNames as jest.Mock).mockResolvedValue(['gate-f1.json']);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('parse error'));
      const logger = createMockLogger();
      const svc = new GateRegistryService(gatesPath, fs, logger);

      const gates = await svc.loadAll();

      expect(gates).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('gate-f1.json'));
    });

    it('ignores non gate-f*.json directory entries', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      (fs.readdirNames as jest.Mock).mockResolvedValue(['gate-f1.json', 'sdlc-gate.schema.json', '.DS_Store']);
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const gates = await svc.loadAll();

      // Only gate-f1 matches /^gate-f\d+\.json$/
      expect(gates).toHaveLength(1);
    });
  });

  describe('getGate', () => {
    it('returns the correct definition for a known stable ID', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1, 'gate-f2': GATE_F2 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const gate = await svc.getGate('gate-f2');

      expect(gate).not.toBeNull();
      expect(gate!.id).toBe('gate-f2');
      expect(gate!.name).toBe('Design Baseline Approved');
    });

    it('routes by exact stable ID, not substring', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1, 'gate-f2': GATE_F2 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      // 'f' alone must NOT match any gate
      const gate = await svc.getGate('f');
      expect(gate).toBeNull();
    });

    it('returns null for an unknown gate ID', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const gate = await svc.getGate('gate-f99');
      expect(gate).toBeNull();
    });
  });

  describe('getGatesForPhase', () => {
    it('returns gates matching the given phase string', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1, 'gate-f2': GATE_F2 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const result = await svc.getGatesForPhase('f1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('gate-f1');
    });

    it('returns empty array when phase has no gates', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const result = await svc.getGatesForPhase('f9');
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllGateIds', () => {
    it('returns all stable IDs in phase order', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1, 'gate-f2': GATE_F2 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const ids = await svc.getAllGateIds();
      expect(ids).toEqual(['gate-f1', 'gate-f2']);
    });
  });

  describe('getOpaRulesForGate', () => {
    it('returns deduplicated .rego paths for a gate', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      // gate-f1 has two artifacts both citing 'rulesets/opa/governance.rego'
      const rules = await svc.getOpaRulesForGate('gate-f1');
      expect(rules).toEqual(['rulesets/opa/governance.rego']);
    });

    it('returns empty array for unknown gate', async () => {
      const fs = createMockFs({ 'gate-f1': GATE_F1 });
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const rules = await svc.getOpaRulesForGate('gate-f99');
      expect(rules).toEqual([]);
    });
  });

  describe('loads gate-f1 through gate-f5 canonical definitions', () => {
    it('loads all 5 gates with correct IDs', async () => {
      const allGates: Record<string, GateDefinition> = {};
      for (let i = 1; i <= 5; i++) {
        allGates[`gate-f${i}`] = {
          id: `gate-f${i}`,
          name: `Gate F${i}`,
          phase: `f${i}`,
          description: `Phase ${i}`,
          requiredArtifacts: [
            { artifact: `Artifact-${i}`, validation: 'valid', rules: [`rulesets/opa/phase${i}.rego`] },
          ],
          blockingCriteria: [],
        };
      }
      const fs = createMockFs(allGates);
      const svc = new GateRegistryService(gatesPath, fs, createMockLogger());

      const gates = await svc.loadAll();

      expect(gates).toHaveLength(5);
      expect(gates.map(g => g.id)).toEqual(['gate-f1', 'gate-f2', 'gate-f3', 'gate-f4', 'gate-f5']);
    });
  });
});
