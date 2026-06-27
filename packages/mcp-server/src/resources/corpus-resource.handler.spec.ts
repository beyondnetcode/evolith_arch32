import { Test } from '@nestjs/testing';
import { CorpusResourceHandler } from './corpus-resource.handler';
import { FILE_SYSTEM } from '../domain/domain.tokens';

describe('CorpusResourceHandler', () => {
  let handler;
  const mockFs = {
    readdirNames: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorpusResourceHandler,
        { provide: FILE_SYSTEM, useValue: mockFs },
      ],
    }).compile();

    handler = module.get(CorpusResourceHandler);
    mockFs.readdirNames.mockResolvedValue(['opa-governance.rego', 'topology-microservices.json', 'adr-001.md']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('listCorpusResources returns an array', async () => {
    const result = await handler.listCorpusResources('/corpus');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('infers type "ruleset" for filenames containing "opa"', async () => {
    const result = await handler.listCorpusResources('/corpus');
    const entry = result.find((e) => e.name === 'opa-governance.rego');
    expect(entry.type).toBe('ruleset');
  });

  it('infers type "topology" for filenames containing "topolog"', async () => {
    const result = await handler.listCorpusResources('/corpus');
    const entry = result.find((e) => e.name === 'topology-microservices.json');
    expect(entry.type).toBe('topology');
  });

  it('infers type "adr" for other filenames', async () => {
    const result = await handler.listCorpusResources('/corpus');
    const entry = result.find((e) => e.name === 'adr-001.md');
    expect(entry.type).toBe('adr');
  });

  it('builds correct URI for each entry', async () => {
    const result = await handler.listCorpusResources('/corpus');
    expect(result[0].uri).toBe('evolith://corpus/opa-governance.rego');
  });
});
