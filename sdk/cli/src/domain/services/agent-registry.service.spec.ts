import { AgentRegistryService, AgentInfo } from './agent-registry.service';

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

    it('should return agents from registry file', async () => {
      mockFileSystem.exists.mockImplementation((p: string) => {
        if (p.includes('agents-registry.json')) return Promise.resolve(true);
        if (p.includes('.evolith/agents')) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileSystem.readJson.mockResolvedValue({
        agents: [
          { name: 'agent-1', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' },
        ],
        lastUpdated: '2026-01-01',
      });

      const result = await service.discover('/test-repo');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('agent-1');
    });

    it('should discover agents from directory structure', async () => {
      mockFileSystem.exists.mockImplementation((p: string) => {
        if (p.endsWith('agents-registry.json')) return Promise.resolve(false);
        if (p.endsWith('agent.json')) return Promise.resolve(true);
        if (p.endsWith('.evolith/agents')) return Promise.resolve(true);
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
        if (p.includes('.evolith/agents')) return Promise.resolve(true);
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

  describe('register', () => {
    it('should register a new agent', async () => {
      mockFileSystem.exists.mockResolvedValue(false);
      mockFileSystem.readJson.mockResolvedValue({ agents: [], lastUpdated: '' });

      const agent: AgentInfo = {
        name: 'test-agent',
        version: '1.0.0',
        template: 'standard',
        rulesetFiles: [],
        installedAt: '2026-01-01',
      };

      await service.register('/test-repo', agent);

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });

    it('should update existing agent', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [{ name: 'test-agent', version: '0.9.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }],
        lastUpdated: '2026-01-01',
      });

      const agent: AgentInfo = {
        name: 'test-agent',
        version: '1.0.0',
        template: 'standard',
        rulesetFiles: [],
        installedAt: '2026-01-02',
      };

      await service.register('/test-repo', agent);

      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should remove agent from registry', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [
          { name: 'agent-a', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' },
          { name: 'agent-b', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' },
        ],
        lastUpdated: '2026-01-01',
      });

      await service.unregister('/test-repo', 'agent-a');

      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });

    it('should do nothing if agent not found', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [{ name: 'agent-a', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }],
        lastUpdated: '2026-01-01',
      });

      const result = await service.unregister('/test-repo', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getAgent', () => {
    it('should return agent by name', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [{ name: 'test-agent', version: '1.0.0', template: 'standard', rulesetFiles: [], installedAt: '2026-01-01' }],
        lastUpdated: '2026-01-01',
      });

      const result = await service.getAgent('/test-repo', 'test-agent');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-agent');
    });

    it('should return undefined for non-existent agent', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agents: [],
        lastUpdated: '2026-01-01',
      });

      const result = await service.getAgent('/test-repo', 'nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
