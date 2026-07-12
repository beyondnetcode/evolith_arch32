import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { createAdrTools } from './adr.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

interface SeedAdr {
  id: string;
  number: number;
  title: string;
  status: string;
  date: string;
  context: string;
  decision: string;
  consequences: { positive: string[]; negative: string[]; neutral?: string[] };
  relatedAdrs?: string[];
  tags?: string[];
}

function makeAdr(overrides: Partial<SeedAdr> = {}): SeedAdr {
  return {
    id: 'ADR-0001',
    number: 1,
    title: 'Use Hexagonal Architecture',
    status: 'Proposed',
    date: '2026-01-01',
    context: 'We need a clean architecture.',
    decision: 'Adopt hexagonal ports and adapters.',
    consequences: { positive: ['testable'], negative: ['more files'] },
    relatedAdrs: [],
    tags: [],
    ...overrides,
  };
}

async function seedAdr(baseDir: string, adr: SeedAdr): Promise<void> {
  const adrsDir = path.join(baseDir, 'reference', 'architecture', 'adrs');
  await fsExtra.ensureDir(adrsDir);
  await fsExtra.writeJson(path.join(adrsDir, `${adr.id}.json`), adr);
}

describe('adr tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-adr-'));
    tools = createAdrTools(fs);
  });
  afterEach(() => fsExtra.remove(dir));

  it('creates exactly five tools with the expected names and scopes', () => {
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.schema.name).sort()).toEqual([
      'evolith-adr-create',
      'evolith-adr-get',
      'evolith-adr-list',
      'evolith-adr-matrix',
      'evolith-adr-update',
    ]);
    // Read tools default to read scope; write tools are mutative + write scope.
    expect(byName(tools, 'evolith-adr-list').scope).toBe('read');
    expect(byName(tools, 'evolith-adr-create').mutative).toBe(true);
    expect(byName(tools, 'evolith-adr-create').scope).toBe('write');
    expect(byName(tools, 'evolith-adr-update').mutative).toBe(true);
  });

  // ── evolith-adr-list ──────────────────────────────────────────────────────
  describe('evolith-adr-list', () => {
    it('returns an empty result when no adrs directory exists', async () => {
      const result = (await byName(tools, 'evolith-adr-list').execute({ path: dir })) as {
        count: number;
        adrs: unknown[];
      };
      expect(result).toEqual({ count: 0, adrs: [] });
    });

    it('lists seeded adrs sorted by number descending', async () => {
      await seedAdr(dir, makeAdr({ id: 'ADR-0001', number: 1, title: 'First' }));
      await seedAdr(dir, makeAdr({ id: 'ADR-0002', number: 2, title: 'Second', status: 'Accepted' }));

      const result = (await byName(tools, 'evolith-adr-list').execute({ path: dir })) as {
        count: number;
        adrs: { id: string; title: string; status: string; date: string }[];
      };
      expect(result.count).toBe(2);
      expect(result.adrs.map((a) => a.id)).toEqual(['ADR-0002', 'ADR-0001']);
      expect(result.adrs[0]).toEqual({
        id: 'ADR-0002',
        title: 'Second',
        status: 'Accepted',
        date: '2026-01-01',
      });
    });

    it('defaults to process.cwd() when no path arg is given', async () => {
      const result = (await byName(tools, 'evolith-adr-list').execute({})) as {
        count: number;
        adrs: unknown[];
      };
      expect(typeof result.count).toBe('number');
      expect(Array.isArray(result.adrs)).toBe(true);
    });
  });

  // ── evolith-adr-get ───────────────────────────────────────────────────────
  describe('evolith-adr-get', () => {
    it('throws when id is missing', async () => {
      await expect(byName(tools, 'evolith-adr-get').execute({ path: dir })).rejects.toThrow(
        'id is required',
      );
    });

    it('throws when the adr is not found', async () => {
      await seedAdr(dir, makeAdr());
      await expect(
        byName(tools, 'evolith-adr-get').execute({ path: dir, id: 'ADR-9999' }),
      ).rejects.toThrow('ADR ADR-9999 not found');
    });

    it('returns the full adr when found by id', async () => {
      const adr = makeAdr();
      await seedAdr(dir, adr);
      const result = (await byName(tools, 'evolith-adr-get').execute({
        path: dir,
        id: 'ADR-0001',
      })) as SeedAdr;
      expect(result).toMatchObject({ id: 'ADR-0001', title: adr.title, status: 'Proposed' });
    });
  });

  // ── evolith-adr-create ────────────────────────────────────────────────────
  describe('evolith-adr-create', () => {
    it('throws when the title is missing or too short', async () => {
      await expect(
        byName(tools, 'evolith-adr-create').execute({ path: dir, context: 'c', decision: 'd' }),
      ).rejects.toThrow('title is required (min 5 chars)');
      await expect(
        byName(tools, 'evolith-adr-create').execute({
          path: dir,
          title: 'abc',
          context: 'c',
          decision: 'd',
        }),
      ).rejects.toThrow('title is required (min 5 chars)');
    });

    it('throws when context is missing', async () => {
      await expect(
        byName(tools, 'evolith-adr-create').execute({ path: dir, title: 'Valid title', decision: 'd' }),
      ).rejects.toThrow('context is required');
    });

    it('throws when decision is missing', async () => {
      await expect(
        byName(tools, 'evolith-adr-create').execute({ path: dir, title: 'Valid title', context: 'c' }),
      ).rejects.toThrow('decision is required');
    });

    it('creates a new adr and writes files to disk (full consequences + related + tags)', async () => {
      const result = (await byName(tools, 'evolith-adr-create').execute({
        path: dir,
        title: 'Adopt event sourcing',
        context: 'Need an audit trail.',
        decision: 'Store events as the source of truth.',
        consequences: {
          positive: ['auditable'],
          negative: ['complexity'],
          neutral: ['learning curve'],
        },
        relatedAdrs: ['ADR-0001'],
        tags: ['architecture'],
      })) as { dryRun: boolean; adr: { id: string; title: string; status: string; date: string } };

      expect(result.dryRun).toBe(false);
      expect(result.adr).toMatchObject({
        id: 'ADR-0001',
        title: 'Adopt event sourcing',
        status: 'Proposed',
      });
      const jsonPath = path.join(dir, 'reference', 'architecture', 'adrs', 'ADR-0001.json');
      expect(await fsExtra.pathExists(jsonPath)).toBe(true);
      const written = await fsExtra.readJson(jsonPath);
      expect(written.consequences.neutral).toEqual(['learning curve']);
      expect(written.relatedAdrs).toEqual(['ADR-0001']);
      expect(written.tags).toEqual(['architecture']);
    });

    it('creates without writing files when dryRun is true and coerces non-array/absent fields', async () => {
      const result = (await byName(tools, 'evolith-adr-create').execute({
        path: dir,
        title: 'Dry run adr',
        context: 'ctx',
        decision: 'dec',
        // no consequences → rawConsequences defaults to {}
        // no relatedAdrs / tags → those branches skipped
        dryRun: true,
      })) as { dryRun: boolean; adr: { id: string } };

      expect(result.dryRun).toBe(true);
      expect(result.adr.id).toBe('ADR-0001');
      const jsonPath = path.join(dir, 'reference', 'architecture', 'adrs', 'ADR-0001.json');
      expect(await fsExtra.pathExists(jsonPath)).toBe(false);
    });

    it('ignores non-array consequence fields, falling back to empty arrays', async () => {
      const result = (await byName(tools, 'evolith-adr-create').execute({
        path: dir,
        title: 'Coercion adr',
        context: 'ctx',
        decision: 'dec',
        consequences: { positive: 'not-an-array', negative: 123, neutral: 'nope' },
        relatedAdrs: 'not-an-array',
        tags: 42,
        dryRun: true,
      })) as { adr: { id: string } };
      expect(result.adr.id).toBe('ADR-0001');
    });
  });

  // ── evolith-adr-update ────────────────────────────────────────────────────
  describe('evolith-adr-update', () => {
    it('throws when id is missing', async () => {
      await expect(
        byName(tools, 'evolith-adr-update').execute({ path: dir, status: 'Accepted' }),
      ).rejects.toThrow('id is required');
    });

    it('throws when status is missing', async () => {
      await expect(
        byName(tools, 'evolith-adr-update').execute({ path: dir, id: 'ADR-0001' }),
      ).rejects.toThrow('status is required');
    });

    it('throws when status is invalid', async () => {
      await expect(
        byName(tools, 'evolith-adr-update').execute({ path: dir, id: 'ADR-0001', status: 'Bogus' }),
      ).rejects.toThrow('Invalid status "Bogus"');
    });

    it('throws when the adr to update is not found', async () => {
      await expect(
        byName(tools, 'evolith-adr-update').execute({ path: dir, id: 'ADR-0001', status: 'Accepted' }),
      ).rejects.toThrow('ADR ADR-0001 not found');
    });

    it('updates the status and rewrites the file', async () => {
      await seedAdr(dir, makeAdr());
      const result = (await byName(tools, 'evolith-adr-update').execute({
        path: dir,
        id: 'ADR-0001',
        status: 'Accepted',
        reason: 'consensus reached',
      })) as { id: string; newStatus: string; dryRun: boolean };

      expect(result).toEqual({ id: 'ADR-0001', newStatus: 'Accepted', dryRun: false });
      const jsonPath = path.join(dir, 'reference', 'architecture', 'adrs', 'ADR-0001.json');
      const written = await fsExtra.readJson(jsonPath);
      expect(written.status).toBe('Accepted');
      expect(written.consequences.neutral).toContain('Status changed to Accepted: consensus reached');
    });

    it('does not rewrite the file when dryRun is true', async () => {
      await seedAdr(dir, makeAdr());
      const result = (await byName(tools, 'evolith-adr-update').execute({
        path: dir,
        id: 'ADR-0001',
        status: 'Deprecated',
        dryRun: true,
      })) as { id: string; newStatus: string; dryRun: boolean };

      expect(result).toEqual({ id: 'ADR-0001', newStatus: 'Deprecated', dryRun: true });
      const jsonPath = path.join(dir, 'reference', 'architecture', 'adrs', 'ADR-0001.json');
      const written = await fsExtra.readJson(jsonPath);
      expect(written.status).toBe('Proposed');
    });
  });

  // ── evolith-adr-matrix ────────────────────────────────────────────────────
  describe('evolith-adr-matrix', () => {
    it('returns the matrix summary aggregated by status', async () => {
      await seedAdr(dir, makeAdr({ id: 'ADR-0001', number: 1, status: 'Proposed' }));
      await seedAdr(dir, makeAdr({ id: 'ADR-0002', number: 2, status: 'Accepted' }));
      await seedAdr(dir, makeAdr({ id: 'ADR-0003', number: 3, status: 'Deprecated' }));

      const matrix = (await byName(tools, 'evolith-adr-matrix').execute({ path: dir })) as {
        adrs: unknown[];
        lastUpdated: string;
        summary: { total: number; proposed: number; accepted: number; deprecated: number };
      };

      expect(matrix.adrs).toHaveLength(3);
      expect(matrix.summary).toEqual({ total: 3, proposed: 1, accepted: 1, deprecated: 1 });
      expect(typeof matrix.lastUpdated).toBe('string');
    });
  });
});
