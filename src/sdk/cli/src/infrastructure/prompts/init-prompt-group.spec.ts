import * as p from '@clack/prompts';
import { runInitPromptGroup } from './init-prompt-group';
import type { CatalogLoader } from '../catalog/catalog-loader';

jest.mock('@clack/prompts', () => ({
  text: jest.fn(),
  select: jest.fn(),
  multiselect: jest.fn(),
  confirm: jest.fn(),
  group: jest.fn(),
  cancel: jest.fn(),
  isCancel: jest.fn(),
}));

function mockGroup(overrides: Record<string, unknown> = {}) {
  const pMock = jest.mocked(p);
  (pMock.select as jest.Mock).mockReturnValue('nodejs');
  (pMock.text as jest.Mock).mockReturnValue('test-project');
  (pMock.multiselect as jest.Mock).mockReturnValue([]);
  (pMock.confirm as jest.Mock).mockReturnValue(true);

  (pMock.group as jest.Mock).mockImplementation(
    async (prompts: Record<string, (opts: { results: Record<string, unknown> }) => unknown>) => {
      const results: Record<string, unknown> = {};
      for (const [key, factory] of Object.entries(prompts)) {
        try {
          results[key] = await factory({ results });
        } catch {
          // handle onCancel throw
        }
      }
      return { ...results, ...overrides };
    },
  );
}

describe('runInitPromptGroup', () => {
  const mockCatalog = {
    loadRuntimeCatalog: jest.fn().mockReturnValue([
      { id: 'nodejs', name: 'Node.js', defaultVersion: '20', language: 'TypeScript', databases: [] },
    ]),
    getMonorepoOptions: jest.fn().mockReturnValue([{ id: 'none', name: 'None', description: 'No monorepo' }]),
    getArchitecturePatterns: jest.fn().mockReturnValue([{ id: 'clean', name: 'Clean Architecture', description: 'DDD layers' }]),
    getApiProtocols: jest.fn().mockReturnValue([{ id: 'rest', name: 'REST', description: 'HTTP REST' }]),
    getDefaultDatabase: jest.fn().mockReturnValue('postgres'),
  } as unknown as CatalogLoader;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns selected options when confirmed', async () => {
    mockGroup({ confirmInit: true });

    const result = await runInitPromptGroup(mockCatalog);
    expect(result).not.toBeNull();
    expect(result!.runtime).toBeDefined();
  });

  it('returns null when cancelled', async () => {
    mockGroup({ confirmInit: false });

    const result = await runInitPromptGroup(mockCatalog);
    expect(result).toBeNull();
  });

  it('calls catalog methods to load options', async () => {
    mockGroup({ confirmInit: true });

    await runInitPromptGroup(mockCatalog);
    expect(mockCatalog.loadRuntimeCatalog).toHaveBeenCalled();
    expect(mockCatalog.getMonorepoOptions).toHaveBeenCalled();
    expect(mockCatalog.getArchitecturePatterns).toHaveBeenCalled();
    expect(mockCatalog.getApiProtocols).toHaveBeenCalled();
  });
});
