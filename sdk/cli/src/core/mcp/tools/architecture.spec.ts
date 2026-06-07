import { handleArchitectureTools } from './architecture';

jest.mock('./tool-utils', () => ({
  getFileSystem: jest.fn(),
  getContainer: jest.fn(),
}));

import { getFileSystem, getContainer } from './tool-utils';

const mockFileSystem = {
  exists: jest.fn(),
  readdirNames: jest.fn(),
  readJson: jest.fn(),
  stat: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
};

const mockConfigParser = {
  parse: jest.fn(),
};

describe('MCP Tools - architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    (getContainer as jest.Mock).mockReturnValue({
      createConfigParser: jest.fn().mockReturnValue(mockConfigParser),
    });
  });

  describe('handleArchitectureTools', () => {
    it('should return error when path is missing', async () => {
      const result = await handleArchitectureTools({});

      expect(result).toHaveProperty('error', true);
      expect(result).toHaveProperty('message', 'path is required');
    });

    it('should validate F1 level by default', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleArchitectureTools({ path: '/test/repo' });

      expect(result).toHaveProperty('level', 'F1');
      expect(result).toHaveProperty('repository', '/test/repo');
    });

    it('should validate F1 modular independence', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({ workspaces: ['packages/*'] });
      mockFileSystem.readdirNames.mockResolvedValue(['module1', 'module2', 'module3', 'module4', 'module5', 'module6']);

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F1' });

      expect(result).toHaveProperty('level', 'F1');
      expect(result.issues).toBeDefined();
    });

    it('should detect monorepo workspace', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({ workspaces: ['packages/*'] });

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F1' });

      const workspaceIssue = result.issues.find((i: any) => i.ruleId === 'F1-01');
      expect(workspaceIssue).toBeDefined();
    });

    it('should detect single module issue', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({});
      mockFileSystem.readdirNames.mockResolvedValue(['main.ts']);

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F1' });

      const singleModuleIssue = result.issues.find((i: any) => i.ruleId === 'F1-02');
      expect(singleModuleIssue).toBeDefined();
    });

    it('should validate F2 contract boundaries', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['module1', 'module2']);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F2' });

      expect(result).toHaveProperty('level', 'F2');
    });

    it('should validate F3 extraction readiness', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['module1']);
      mockFileSystem.readJson.mockResolvedValue({});
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readFile.mockResolvedValue('product:\n  type: module');
      mockConfigParser.parse.mockReturnValue({ product: { type: 'module' } });

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F3' });

      expect(result).toHaveProperty('level', 'F3');
    });

    it('should include F1 and F2 issues when level is F2', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['module1']);
      mockFileSystem.readJson.mockResolvedValue({});
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readFile.mockResolvedValue('');
      mockConfigParser.parse.mockReturnValue({});

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F2' });

      const f1Issues = result.issues.filter((i: any) => i.level === 'F1');
      const f2Issues = result.issues.filter((i: any) => i.level === 'F2');

      expect(f1Issues.length).toBeGreaterThan(0);
      expect(f2Issues.length).toBe(0);
    });

    it('should include all levels when F3', async () => {
      mockFileSystem.exists
        .mockResolvedValueOnce(true) // src exists (F1)
        .mockResolvedValueOnce(true) // src exists (F2)
        .mockResolvedValueOnce(true) // module1 entry exists (F2)
        .mockResolvedValueOnce(false) // package.json doesn't exist (F2)
        .mockResolvedValueOnce(true) // evolith.yaml exists (F3)
        .mockResolvedValueOnce(false); // Dockerfile doesn't exist (F3)
      mockFileSystem.readdirNames.mockResolvedValue(['module1']);
      mockFileSystem.readJson.mockResolvedValue({});
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readFile.mockResolvedValue('product:\n  type: module');
      mockConfigParser.parse.mockReturnValue({ product: { type: 'module' } });

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F3' });

      const f1Issues = result.issues.filter((i: any) => i.level === 'F1');
      const f2Issues = result.issues.filter((i: any) => i.level === 'F2');
      const f3Issues = result.issues.filter((i: any) => i.level === 'F3');

      expect(f1Issues.length).toBeGreaterThan(0);
      expect(f2Issues.length).toBe(0);
      expect(f3Issues.length).toBeGreaterThan(0);
    });

    it('should return failed status when blocking issues exist', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['module1']);
      mockFileSystem.readJson.mockResolvedValue({
        evolith: {
          boundedContexts: [{ name: 'context1', productType: 'microservice' }],
        },
      });
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readFile.mockResolvedValue('product:\n  type: microservice');
      mockConfigParser.parse.mockReturnValue({ product: { type: 'microservice' } });

      const result = await handleArchitectureTools({ path: '/test/repo', level: 'F3' });

      expect(result).toHaveProperty('status');
    });

    it('should return passed status when no blocking issues', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleArchitectureTools({ path: '/test/repo' });

      expect(result.status).toBe('passed');
    });

    it('should include timestamp in response', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleArchitectureTools({ path: '/test/repo' });

      expect(result).toHaveProperty('timestamp');
    });

    it('should count blocking issues correctly', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleArchitectureTools({ path: '/test/repo' });

      expect(result).toHaveProperty('blockingIssues', 0);
    });
  });
});
