import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { createStandardsTools } from './standards.tools';

/**
 * GT-682 (#761). The tool reads through core-domain's `StandardsService`, so
 * the fixtures mock the filesystem the service walks
 * (`<path>/reference/standards/standards-index.json`), never the service.
 */
function standard(id: string, category = 'architecture', rules = 1) {
  return {
    id,
    name: `Standard ${id}`,
    version: '1.0.0',
    category,
    description: `About ${id}`,
    rules: Array.from({ length: rules }, (_, i) => ({
      id: `${id}-R${i + 1}`,
      name: `Rule ${i + 1}`,
      severity: 'error',
      description: 'A rule',
    })),
  };
}

describe('createStandardsTools (GT-682 #761)', () => {
  let fsMock: jest.Mocked<IFileSystem>;
  const INDEX = '/ws/reference/standards/standards-index.json';

  beforeEach(() => {
    fsMock = {
      exists: jest.fn(),
      readJson: jest.fn(),
      readFile: jest.fn(),
      ensureDir: jest.fn(),
      writeJson: jest.fn(),
    } as any;
  });

  function mockIndex(standards: unknown[]) {
    fsMock.exists.mockImplementation(async (p: string) => p === INDEX);
    fsMock.readJson.mockImplementation(async (p: string) => {
      if (p !== INDEX) throw new Error(`unexpected read: ${p}`);
      return { standards, lastUpdated: '2026-01-01T00:00:00.000Z' } as any;
    });
  }

  it('registers exactly one read-only tool named evolith-standards', () => {
    const tools = createStandardsTools(fsMock);
    expect(tools).toHaveLength(1);
    expect(tools[0].schema.name).toBe('evolith-standards');
    expect(tools[0].mutative).toBeFalsy();
    expect(tools[0].scope).toBe('read');
    expect(tools[0].schema.inputSchema.properties.action).toMatchObject({ enum: ['list', 'get'] });
  });

  describe('list (default action)', () => {
    it('returns the CLI projection (id/name/version/category/rulesCount) in a success envelope with a correlationId', async () => {
      mockIndex([standard('STD-001', 'architecture', 2), standard('STD-002', 'governance', 0)]);
      const [tool] = createStandardsTools(fsMock);
      const result: any = await tool.execute({ path: '/ws' });

      expect(result).toMatchObject({ success: true, meta: { command: 'evolith-standards', schemaVersion: '1.0.0' } });
      expect(typeof result.meta.correlationId).toBe('string');
      expect(result.meta.correlationId.length).toBeGreaterThan(0);
      expect(result.data).toEqual({
        count: 2,
        standards: [
          { id: 'STD-001', name: 'Standard STD-001', version: '1.0.0', category: 'architecture', rulesCount: 2 },
          { id: 'STD-002', name: 'Standard STD-002', version: '1.0.0', category: 'governance', rulesCount: 0 },
        ],
      });
    });

    it('applies the category filter through the service', async () => {
      mockIndex([standard('STD-001', 'architecture'), standard('STD-002', 'governance')]);
      const [tool] = createStandardsTools(fsMock);
      const result: any = await tool.execute({ action: 'list', category: 'governance', path: '/ws' });
      expect(result.data.count).toBe(1);
      expect(result.data.standards[0].id).toBe('STD-002');
    });

    it('a workspace with no standards index is an empty listing, as on the CLI', async () => {
      fsMock.exists.mockResolvedValue(false);
      const [tool] = createStandardsTools(fsMock);
      const result: any = await tool.execute({ path: '/ws' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ count: 0, standards: [] });
      expect(fsMock.readJson).not.toHaveBeenCalled();
    });

    it('rejects an unknown category before touching the filesystem', async () => {
      const [tool] = createStandardsTools(fsMock);
      const error: any = await tool.execute({ category: 'nonsense', path: '/ws' }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toMatch(/category must be one of/);
      expect(fsMock.exists).not.toHaveBeenCalled();
    });

    it('defaults the workspace root to the process cwd, as the CLI does', async () => {
      fsMock.exists.mockResolvedValue(false);
      const [tool] = createStandardsTools(fsMock);
      await tool.execute({});
      expect(fsMock.exists).toHaveBeenCalledWith(`${process.cwd()}/reference/standards/standards-index.json`);
    });
  });

  describe('get', () => {
    it('returns the full standard, rules included', async () => {
      mockIndex([standard('STD-001', 'architecture', 2)]);
      const [tool] = createStandardsTools(fsMock);
      const result: any = await tool.execute({ action: 'get', id: 'STD-001', path: '/ws' });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('STD-001');
      expect(result.data.rules).toHaveLength(2);
    });

    it('throws PATH_NOT_FOUND for an unknown id (the dispatcher turns it into an error envelope)', async () => {
      mockIndex([standard('STD-001')]);
      const [tool] = createStandardsTools(fsMock);
      const error: any = await tool.execute({ action: 'get', id: 'STD-404', path: '/ws' }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('PATH_NOT_FOUND');
      expect(error.message).toContain('Standard STD-404 not found');
    });

    it('requires an id', async () => {
      const [tool] = createStandardsTools(fsMock);
      const error: any = await tool.execute({ action: 'get', path: '/ws' }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toMatch(/id is required/);
    });
  });

  it('rejects an unknown action — init/validate/export are not on this surface', async () => {
    const [tool] = createStandardsTools(fsMock);
    for (const action of ['init', 'validate', 'export']) {
      const error: any = await tool.execute({ action, path: '/ws' }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toMatch(/action must be one of: list, get/);
    }
  });

  it('wraps a filesystem failure as IO_ERROR thrown to the dispatcher', async () => {
    fsMock.exists.mockResolvedValue(true);
    fsMock.readJson.mockRejectedValue(new Error('EACCES: permission denied'));
    const [tool] = createStandardsTools(fsMock);
    const error: any = await tool.execute({ path: '/ws' }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('IO_ERROR');
    expect(error.message).toContain('evolith-standards failed: EACCES');
  });
});
