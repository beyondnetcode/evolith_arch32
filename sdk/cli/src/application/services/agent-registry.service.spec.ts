import { AgentRegistryService, AgentInfo } from '../../infrastructure/adapters/agent-registry.service';

const mockFileSystem = {
  exists: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  readdirNames: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  remove: jest.fn(),
  stat: jest.fn(),
};

describe('AgentRegistryService', () => {
  let service: AgentRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgentRegistryService(mockFileSystem as any);
  });

  describe('discover', () => {
    it('should return empty array when agents directory does not exist', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.discover('/test-repo');

      expect(result).toEqual([]);
    });

    it('should discover agents from directory structure', async () => {
      mockFileSystem.exists.mockImplementation((p: string) => {
        if (p.endsWith('agent.config.json')) return Promise.resolve(true);
        if (p.endsWith('rulesets/agents')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileSystem.readdirNames.mockResolvedValue(['agent-a']);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readJson.mockResolvedValue({
        name: 'agent-a',
        version: '1.0.0',
        template: 'standard',
        rulesetFiles: [],
        installedAt: '2026-01-01',
      });

      const result = await service.discover('/test-repo');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('agent-a');
    });

    it('should skip non-directory entries', async () => {
      mockFileSystem.exists.mockImplementation((p: string) => {
        if (p.includes('rulesets/agents')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileSystem.readdirNames.mockResolvedValue(['file.txt', 'agent-a']);
      mockFileSystem.stat.mockImplementation((p: string) => {
        if (p.includes('file.txt')) return Promise.resolve({ isDirectory: () => false });
        return Promise.resolve({ isDirectory: () => true });
      });

      const result = await service.discover('/test-repo');

      expect(result).toEqual([]);
    });
  });

  describe('installAgent', () => {
    it('should install a new agent', async () => {
      mockFileSystem.exists.mockResolvedValue(false);
      mockFileSystem.readJson.mockResolvedValue({ agents: [], lastUpdated: '' });

      const agent: AgentInfo = {
        name: 'test-agent',
        version: '1.0.0',
        template: 'standard',
        rulesetFiles: [],
        installedAt: '2026-01-01',
      };

      await service.installAgent('/test-repo', agent, { rules: [] });

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });
  });

  describe('updateAgent', () => {
    it('should update existing agent', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [
          { name: 'test-agent', version: '0.9.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }
        ],
        lastUpdated: '2026-01-01'
      });

      const agent: AgentInfo = {
        name: 'test-agent',
        version: '1.0.0',
        template: 'standard',
        rulesetFiles: [],
        installedAt: '2026-01-02',
      };

      await service.updateAgent('/test-repo', 'test-agent', agent, { rules: [] });

      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should remove agent from registry', async () => {
      mockFileSystem.exists.mockImplementation((p: string) => {
        if (p.endsWith('rulesets/agents/agent-a')) return Promise.resolve(true);
        if (p.endsWith('agents-registry.json')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileSystem.readJson.mockResolvedValue({
        agents: [{ name: 'agent-a', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }],
        lastUpdated: '2026-01-01'
      });

      const result = await service.unregister('/test-repo', 'agent-a');

      expect(mockFileSystem.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should do nothing if agent not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.unregister('/test-repo', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getAgent', () => {
    it('should return agent by name', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [{ name: 'test-agent', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }],
        lastUpdated: '2026-01-01'
      });

      const result = await service.getAgent('/test-repo', 'test-agent');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-agent');
    });

    it('should return undefined for non-existent agent', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.getAgent('/test-repo', 'nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
