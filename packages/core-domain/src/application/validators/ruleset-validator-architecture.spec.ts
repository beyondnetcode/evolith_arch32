import { RulesetValidatorService, ArchitectureValidationResult } from './ruleset-validator.service';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { TopologyCatalogService } from '../services/topology-catalog.service';

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    ...overrides,
  };
  return mock as unknown as IFileSystem;
};

const mockF1Ruleset = {
  rules: [
    {
      id: 'F1-R01',
      severity: 'MUST',
      category: 'topology',
      title: 'Single Deployment Unit',
      description: 'All bounded contexts MUST be deployed as a single artifact',
      blocking: true,
    },
    {
      id: 'F1-R02',
      severity: 'MUST',
      category: 'bounded-contexts',
      title: 'Explicit Bounded Context Boundaries',
      description: 'Each bounded context MUST be clearly separated',
      blocking: true,
    },
    {
      id: 'F1-R03',
      severity: 'MUST',
      category: 'hexagonal-architecture',
      title: 'Ports and Adapters Boundary',
      description: 'All bounded contexts MUST implement hexagonal architecture',
      blocking: true,
    },
  ],
};

describe('RulesetValidatorService - Architecture Validation', () => {
  let service: RulesetValidatorService;
  let mockFs: IFileSystem;
  let mockTopologyCatalog: jest.Mocked<TopologyCatalogService>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFs = createMockFileSystem({
      readFile: jest.fn().mockImplementation((p: string) => {
        if (p.includes('f1-modular-monolith') || p.includes('modular-monolith.rules.json')) return Promise.resolve(JSON.stringify(mockF1Ruleset));
        if (p.includes('f2-distributed-modules')) return Promise.resolve(JSON.stringify({ rules: [] }));
        if (p.includes('f3-microservices')) return Promise.resolve(JSON.stringify({ rules: [] }));
        return Promise.resolve('');
      }),
    });
    
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    } as any;
    
    mockTopologyCatalog = {
      list: jest.fn(),
      get: jest.fn(),
      resolveProgressivePhase: jest.fn(),
    } as any;
    
    // Default resolveProgressivePhase behavior
    mockTopologyCatalog.resolveProgressivePhase.mockImplementation(async (corePath, phase) => {
      const profile = phase === 'F1' ? 'modular-monolith' : phase === 'F2' ? 'distributed-modules' : 'microservices';
      return {
        apiVersion: 'evolith.dev/topology/v1',
        kind: 'TopologyManifest',
        metadata: { id: profile },
        spec: {
          compatibility: { progressiveAxis: { phases: [phase] } },
          artifacts: {
            rulesets: [`reference/architecture/topologies/progressive-axis/${profile}/${profile}.rules.json`]
          }
        }
      } as any;
    });

    service = new RulesetValidatorService({ 
      fileSystem: mockFs,
      logger: mockLogger,
      configParser: { parse: jest.fn() } as any,
      rulesetRepo: {} as any,
      topologyCatalog: mockTopologyCatalog
    });
  });

  afterEach(() => {
      });

  describe('validateArchitecture', () => {
    it('should validate F1 architecture level', async () => {
      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('levels');
      expect(result).toHaveProperty('rulesChecked');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('timestamp');
      expect(result.levels).toContain('F1');
    });

    it('should validate ALL architecture levels by default', async () => {
      const result = await service.validateArchitecture('/project', '/core');

      expect(result.levels).toContain('F1');
      expect(result.levels).toContain('F2');
      expect(result.levels).toContain('F3');
    });

    it('should validate specific level when specified', async () => {
      const result = await service.validateArchitecture('/project', '/core', { level: 'F2' });

      expect(result.levels).toEqual(['F2']);
    });

    it('should return failed status when blocking issues exist', async () => {
      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.status).toBe('failed');
    });

    it('should return issues array even when validation passes', async () => {
      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should count rules checked', async () => {
      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.rulesChecked).toBeGreaterThan(0);
    });

    it('should handle missing ruleset gracefully', async () => {
      (mockFs.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.issues.some((i: { ruleId: string }) => i.ruleId.includes('MISSING'))).toBe(true);
    });
  });

  describe('validateArchitectureRule - topology', () => {
    it('should validate topology rules for F1', async () => {
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('f1-modular-monolith')) {
          return Promise.resolve(JSON.stringify({
            rules: [{
              id: 'F1-R01',
              severity: 'MUST',
              category: 'topology',
              title: 'Single Deployment Unit',
              description: 'All bounded contexts MUST be deployed as a single artifact',
              blocking: true,
            }],
          }));
        }
        return Promise.resolve(JSON.stringify({ rules: [] }));
      });

      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.rulesChecked).toBeGreaterThan(0);
    });
  });

  describe('validateArchitectureRule - bounded-contexts', () => {
    it('should validate bounded contexts rules', async () => {
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('f1-modular-monolith')) {
          return Promise.resolve(JSON.stringify({
            rules: [{
              id: 'F1-R02',
              severity: 'MUST',
              category: 'bounded-contexts',
              title: 'Explicit Bounded Context Boundaries',
              description: 'Each bounded context MUST be clearly separated',
              blocking: true,
            }],
          }));
        }
        return Promise.resolve(JSON.stringify({ rules: [] }));
      });
      (mockFs.readdirNames as jest.Mock).mockResolvedValue(['context-a', 'context-b']);

      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.rulesChecked).toBeGreaterThan(0);
    });
  });

  describe('validateArchitectureRule - hexagonal-architecture', () => {
    it('should validate hexagonal architecture rules', async () => {
      (mockFs.readFile as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('f1-modular-monolith')) {
          return Promise.resolve(JSON.stringify({
            rules: [{
              id: 'F1-R03',
              severity: 'MUST',
              category: 'hexagonal-architecture',
              title: 'Ports and Adapters Boundary',
              description: 'All bounded contexts MUST implement hexagonal architecture',
              blocking: true,
            }],
          }));
        }
        return Promise.resolve(JSON.stringify({ rules: [] }));
      });

      const result = await service.validateArchitecture('/project', '/core', { level: 'F1' });

      expect(result.rulesChecked).toBeGreaterThan(0);
    });
  });
});
