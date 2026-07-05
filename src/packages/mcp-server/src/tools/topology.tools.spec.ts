import { createTopologyTools } from './topology.tools';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core';

describe('createTopologyTools', () => {
  let fsMock: jest.Mocked<IFileSystem>;
  let loggerMock: jest.Mocked<ILogger>;

  beforeEach(() => {
    fsMock = {
      exists: jest.fn(),
      readFile: jest.fn(),
      readJson: jest.fn(),
      readdir: jest.fn(),
      readdirNames: jest.fn(),
      writeFile: jest.fn(),
      writeJson: jest.fn(),
      mkdir: jest.fn(),
      remove: jest.fn(),
      stat: jest.fn(),
    } as any;
    loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    } as any;
  });

  it('should return 4 tools', () => {
    const tools = createTopologyTools(fsMock, loggerMock);
    expect(tools).toHaveLength(4);
    expect(tools[0].schema.name).toBe('evolith-topology-list');
    expect(tools[1].schema.name).toBe('evolith-topology-get');
    expect(tools[2].schema.name).toBe('evolith-topology-recommend');
    expect(tools[3].schema.name).toBe('evolith-phase-artifacts-evaluate');
  });

  describe('evolith-topology-list', () => {
    it('should list topologies successfully', async () => {
      const tools = createTopologyTools(fsMock, loggerMock);
      const listTool = tools[0];

      fsMock.exists.mockResolvedValue(true);
      fsMock.readdir.mockResolvedValue([
        { name: 'op_01', isDirectory: () => true, isFile: () => false } as any
      ]);
      fsMock.readdir.mockResolvedValueOnce([
        { name: 'topology.manifest.json', isDirectory: () => false, isFile: () => true } as any
      ]);
      fsMock.readFile.mockResolvedValue(JSON.stringify({
        apiVersion: 'evolith.dev/topology/v1',
        kind: 'TopologyManifest',
        metadata: { id: 'test-topology' },
        spec: { compatibility: { progressiveAxis: {} } }
      }));

      const result = await listTool.execute({});
      expect(result.error).toBeUndefined();
      expect(result.count).toBe(1);
    });
  });

  describe('evolith-topology-get', () => {
    it('should return error if id is missing', async () => {
      const tools = createTopologyTools(fsMock, loggerMock);
      const getTool = tools[1];
      const result = await getTool.execute({});
      expect(result.error).toBe(true);
    });

    it('returns a not-found envelope when the topology does not resolve', async () => {
      fsMock.exists.mockResolvedValue(false);
      const [, getTool] = createTopologyTools(fsMock, loggerMock);
      const result = await getTool.execute({ id: 'missing', corePath: '/core' });
      expect(result).toMatchObject({ error: true, message: expect.stringContaining('missing') });
    });

    it('returns the topology envelope when found', async () => {
      const manifest = {
        apiVersion: 'evolith.dev/topology/v1',
        kind: 'TopologyManifest',
        metadata: { id: 'modular-monolith' },
        spec: { compatibility: { progressiveAxis: { phase: 'F1' } } },
      };
      fsMock.exists.mockResolvedValue(true);
      fsMock.readdir.mockResolvedValue([
        { name: 'modular-monolith', isDirectory: () => true, isFile: () => false } as never,
      ]);
      fsMock.readdir.mockResolvedValueOnce([
        { name: 'modular-monolith', isDirectory: () => true, isFile: () => false } as never,
      ]);
      fsMock.readdir.mockResolvedValueOnce([
        { name: 'topology.manifest.json', isDirectory: () => false, isFile: () => true } as never,
      ]);
      fsMock.readFile.mockResolvedValue(JSON.stringify(manifest));
      const [, getTool] = createTopologyTools(fsMock, loggerMock);
      const result = await getTool.execute({ id: 'modular-monolith', corePath: '/core' });
      expect(result).toMatchObject({
        tool: 'evolith-topology-get',
        id: 'modular-monolith',
        topology: expect.objectContaining({ metadata: { id: 'modular-monolith' } }),
      });
    });

    it('wraps unexpected errors into the error envelope', async () => {
      fsMock.exists.mockRejectedValue(new Error('disk on fire'));
      const [, getTool] = createTopologyTools(fsMock, loggerMock);
      const result = await getTool.execute({ id: 'x', corePath: '/core' });
      expect(result).toMatchObject({ error: true, message: expect.stringContaining('disk on fire') });
    });
  });

  describe('evolith-topology-list (error path)', () => {
    it('wraps catalog failures into the error envelope', async () => {
      fsMock.exists.mockRejectedValue(new Error('catalog broken'));
      const [listTool] = createTopologyTools(fsMock, loggerMock);
      const result = await listTool.execute({ corePath: '/core' });
      expect(result).toMatchObject({ error: true, message: expect.stringContaining('catalog broken') });
    });
  });

  describe('evolith-topology-recommend (GT-431)', () => {
    const rules = {
      id: 'topology-recommendation',
      version: '1.0.0',
      progressive: [{ id: 'MM', when: {}, recommend: 'modular-monolith', rationale: 'default', priority: 1 }],
      dimensions: [{ id: 'ED', when: { asyncIntegration: true }, recommend: 'event-driven', rationale: 'async' }],
    };

    it('loads the rules from corePath and recommends a composition from signals', async () => {
      fsMock.readFile.mockResolvedValue(JSON.stringify(rules));
      const [, , recommendTool] = createTopologyTools(fsMock, loggerMock);
      const result = await recommendTool.execute({ corePath: '/core', signals: { asyncIntegration: true } });
      expect(fsMock.readFile).toHaveBeenCalledWith('/core/src/rulesets/architecture/topology-recommendation.rules.json');
      expect(result).toMatchObject({
        success: true,
        data: {
          recommended: ['modular-monolith', 'event-driven'],
          composition: 'modular-monolith + event-driven',
        },
        meta: { command: 'evolith-topology-recommend', schemaVersion: '1.0.0' },
      });
    });

    it('defaults to modular-monolith when no signals are provided', async () => {
      fsMock.readFile.mockResolvedValue(JSON.stringify(rules));
      const [, , recommendTool] = createTopologyTools(fsMock, loggerMock);
      const result = await recommendTool.execute({ corePath: '/core' });
      expect(result).toMatchObject({ success: true, data: { recommended: ['modular-monolith'] } });
    });

    it('wraps rule-loading failures into the error envelope', async () => {
      fsMock.readFile.mockRejectedValue(new Error('rules missing'));
      const [, , recommendTool] = createTopologyTools(fsMock, loggerMock);
      const result = await recommendTool.execute({ corePath: '/core' });
      expect(result).toMatchObject({ error: true, message: expect.stringContaining('rules missing') });
    });
  });

  describe('evolith-phase-artifacts-evaluate (GT-434)', () => {
    it('rejects an unknown phase', async () => {
      const [, , , phaseTool] = createTopologyTools(fsMock, loggerMock);
      const result = await phaseTool.execute({ phase: 'nope', topologies: [] });
      expect(result).toMatchObject({ error: true, message: expect.stringContaining('phase must be one of') });
    });

    it('measures completeness against universal artifacts when no topology profiles resolve', async () => {
      fsMock.exists.mockResolvedValue(false); // catalog.get resolves to undefined → universal-only
      const [, , , phaseTool] = createTopologyTools(fsMock, loggerMock);
      const result = await phaseTool.execute({
        phase: 'deployment',
        topologies: ['serverless'],
        declaredArtifacts: [],
      });
      expect(result).toMatchObject({
        success: true,
        data: { phase: 'deployment', completeness: 0 },
        meta: { command: 'evolith-phase-artifacts-evaluate', schemaVersion: '1.0.0' },
      });
      expect(result.data.missingArtifacts).toContain('release-plan');
    });

    it('unions a topology phaseProfile with the universal artifacts', async () => {
      const manifest = {
        apiVersion: 'evolith.dev/topology/v1',
        kind: 'TopologyManifest',
        metadata: { id: 'microservices' },
        spec: {
          compatibility: { progressiveAxis: { maturityLevel: 'F3' } },
          phaseProfiles: { quality: { required: [{ artifactKind: 'consumer-contract-verification' }] } },
        },
      };
      fsMock.exists.mockResolvedValue(true);
      fsMock.readdir.mockResolvedValue([
        { name: 'microservices', isDirectory: () => true, isFile: () => false } as never,
      ]);
      fsMock.readdir.mockResolvedValueOnce([
        { name: 'microservices', isDirectory: () => true, isFile: () => false } as never,
      ]);
      fsMock.readdir.mockResolvedValueOnce([
        { name: 'topology.manifest.json', isDirectory: () => false, isFile: () => true } as never,
      ]);
      fsMock.readFile.mockResolvedValue(JSON.stringify(manifest));
      const [, , , phaseTool] = createTopologyTools(fsMock, loggerMock);
      const result = await phaseTool.execute({
        phase: 'quality',
        topologies: ['microservices'],
        declaredArtifacts: ['consumer-contract-verification'],
      });
      expect(result).toMatchObject({ success: true, data: { phase: 'quality' } });
      expect(result.data.requiredArtifacts).toContain('consumer-contract-verification');
      expect(result.data.presentArtifacts).toContain('consumer-contract-verification');
    });
  });
});
