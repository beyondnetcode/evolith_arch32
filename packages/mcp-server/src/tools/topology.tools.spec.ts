import { createTopologyTools } from './topology.tools';
import type { IFileSystem, ILogger } from '@evolith/core';

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

  it('should return 2 tools', () => {
    const tools = createTopologyTools(fsMock, loggerMock);
    expect(tools).toHaveLength(2);
    expect(tools[0].schema.name).toBe('evolith-topology-list');
    expect(tools[1].schema.name).toBe('evolith-topology-get');
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
});
