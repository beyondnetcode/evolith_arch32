import { listResources, readResource } from './index';

jest.mock('../tools/tool-utils', () => ({
  getFileSystem: jest.fn(),
  getContainer: jest.fn(),
}));

import { getFileSystem, getContainer } from '../tools/tool-utils';

const mockFileSystem = {
  exists: jest.fn(),
  readdir: jest.fn(),
  readdirNames: jest.fn(),
  readJson: jest.fn(),
  readFile: jest.fn(),
  existsSync: jest.fn(),
  stat: jest.fn(),
};

const mockConfigParser = {
  parse: jest.fn(),
};

describe('MCP Resources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    (getContainer as jest.Mock).mockReturnValue({
      createConfigParser: jest.fn().mockReturnValue(mockConfigParser),
    });
  });

  describe('listResources', () => {
    it('should return list of available resources', async () => {
      const result = await listResources();

      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should include rulesets resource', async () => {
      const result = await listResources();

      const rulesetsResource = result.resources.find((r: any) => r.uri === 'evolith://rulesets');
      expect(rulesetsResource).toBeDefined();
      expect(rulesetsResource?.name).toBe('Rulesets');
    });

    it('should include phase-gates resource', async () => {
      const result = await listResources();

      const phaseGatesResource = result.resources.find((r: any) => r.uri === 'evolith://phase-gates');
      expect(phaseGatesResource).toBeDefined();
    });

    it('should include agents resource', async () => {
      const result = await listResources();

      const agentsResource = result.resources.find((r: any) => r.uri === 'evolith://agents');
      expect(agentsResource).toBeDefined();
    });

    it('should include governance version resource', async () => {
      const result = await listResources();

      const versionResource = result.resources.find((r: any) => r.uri === 'evolith://governance/version');
      expect(versionResource).toBeDefined();
    });

    it('should include core version resource', async () => {
      const result = await listResources();

      const coreVersionResource = result.resources.find((r: any) => r.uri === 'evolith://core/version');
      expect(coreVersionResource).toBeDefined();
    });

    it('should include repository config resource', async () => {
      const result = await listResources();

      const configResource = result.resources.find((r: any) => r.uri === 'evolith://repository/config');
      expect(configResource).toBeDefined();
    });
  });

  describe('readResource', () => {
    describe('evolith://rulesets', () => {
      it('should return empty list when rulesets directory not found', async () => {
        mockFileSystem.existsSync.mockReturnValue(false);

        const result = await readResource({ uri: 'evolith://rulesets' });

        expect((result as any).error).toBeDefined();
        expect((result as any).rulesets).toEqual([]);
      });

      it('should return list of rulesets when directory exists', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readdir.mockResolvedValue([
          { name: 'governance', isDirectory: () => true },
          { name: 'acl', isDirectory: () => true },
        ]);
        mockFileSystem.readdirNames
          .mockResolvedValueOnce(['open-core-boundary.rules.json'])
          .mockResolvedValueOnce(['anti-corruption-layer.rules.json']);

        const result = await readResource({ uri: 'evolith://rulesets' });

        expect((result as any).rulesets.length).toBeGreaterThan(0);
        expect((result as any).count).toBe((result as any).rulesets.length);
      });
    });

    describe('evolith://phase-gates', () => {
      it('should return phase gate definitions', async () => {
        const result = await readResource({ uri: 'evolith://phase-gates' });

        expect((result as any).phaseGates).toBeDefined();
        expect((result as any).phaseGates.length).toBe(5);
        expect((result as any).phaseGates[0].phase).toBe('phase-0');
        expect((result as any).phaseGates[0].name).toBe('Foundation');
      });

      it('should include all 5 phases', async () => {
        const result = await readResource({ uri: 'evolith://phase-gates' });

        const phases = (result as any).phaseGates.map((g: any) => g.phase);
        expect(phases).toContain('phase-0');
        expect(phases).toContain('phase-1');
        expect(phases).toContain('phase-2');
        expect(phases).toContain('phase-3');
        expect(phases).toContain('phase-4');
      });
    });

    describe('evolith://agents', () => {
      it('should return empty list when agents directory not found', async () => {
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://agents' });

        expect((result as any).agents).toEqual([]);
      });

      it('should return list of agents when directory exists', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readdirNames.mockResolvedValue(['agent-1', 'agent-2']);

        const result = await readResource({ uri: 'evolith://agents' });

        expect((result as any).agents).toEqual(['agent-1', 'agent-2']);
        expect((result as any).count).toBe(2);
      });
    });

    describe('evolith://governance/version', () => {
      it('should return governance version', async () => {
        const result = await readResource({ uri: 'evolith://governance/version' });

        expect((result as any).version).toBe('1.0.0');
        expect((result as any).schema).toBe('governance');
      });
    });

    describe('evolith://core/version', () => {
      it('should return core version', async () => {
        const result = await readResource({ uri: 'evolith://core/version' });

        expect((result as any).version).toBe('1.0.0');
        expect((result as any).schema).toBe('core');
      });
    });

    describe('evolith://repository/config', () => {
      it('should return error when evolith.yaml not found', async () => {
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://repository/config' });

        expect((result as any).error).toBe('evolith.yaml not found');
      });

      it('should return parsed config when evolith.yaml exists', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readFile.mockResolvedValue('name: test\ncoreRef: 1.0.0');
        mockConfigParser.parse.mockReturnValue({ name: 'test', coreRef: '1.0.0' });

        const result = await readResource({ uri: 'evolith://repository/config' });

        expect((result as any).name).toBe('test');
        expect((result as any).coreRef).toBe('1.0.0');
      });
    });

    describe('evolith://ruleset/{name}', () => {
      it('should return ruleset content when found', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readJson.mockResolvedValue({ rules: [{ id: 'R-01' }] });

        const result = await readResource({ uri: 'evolith://ruleset/governance/open-core-boundary' });

        expect((result as any).rules).toBeDefined();
      });

      it('should return error when ruleset not found', async () => {
        mockFileSystem.existsSync.mockReturnValue(false);
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://ruleset/nonexistent' });

        expect((result as any).error).toBe('Ruleset not found: nonexistent');
      });
    });

    describe('evolith://agent/{name}', () => {
      it('should return agent content when found', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readJson.mockResolvedValue({ agent: { name: 'test-agent' } });

        const result = await readResource({ uri: 'evolith://agent/test-agent' });

        expect((result as any).agent.name).toBe('test-agent');
      });

      it('should return error when agent not found', async () => {
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://agent/nonexistent' });

        expect((result as any).error).toBe('Agent not found: nonexistent');
      });
    });

    describe('evolith://open-core/artifacts', () => {
      it('should return open-core boundary rules when found', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readJson.mockResolvedValue({ rules: [] });

        const result = await readResource({ uri: 'evolith://open-core/artifacts' });

        expect((result as any).rules).toBeDefined();
      });

      it('should return error when rules not found', async () => {
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://open-core/artifacts' });

        expect((result as any).error).toBe('Open-Core Boundary rules not found');
      });
    });

    describe('evolith://acl/rules', () => {
      it('should return ACL rules when found', async () => {
        mockFileSystem.exists.mockResolvedValue(true);
        mockFileSystem.readJson.mockResolvedValue({ rules: [{ id: 'ACL-01' }] });

        const result = await readResource({ uri: 'evolith://acl/rules' });

        expect((result as any).rules).toBeDefined();
      });

      it('should return error when ACL rules not found', async () => {
        mockFileSystem.exists.mockResolvedValue(false);

        const result = await readResource({ uri: 'evolith://acl/rules' });

        expect((result as any).error).toBe('ACL rules not found');
      });
    });

    describe('unknown URI', () => {
      it('should throw error for unknown resource URI', async () => {
        await expect(readResource({ uri: 'evolith://unknown' }))
          .rejects.toThrow('Unknown resource URI: evolith://unknown');
      });
    });
  });
});
