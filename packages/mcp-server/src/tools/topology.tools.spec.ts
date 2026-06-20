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
  });
});
