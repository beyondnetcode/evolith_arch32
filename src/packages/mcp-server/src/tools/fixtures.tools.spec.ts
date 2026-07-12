import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import type { IFileSystem } from '@beyondnet/evolith-core';
import { createFixturesTools } from './fixtures.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();

/** Grab the single `evolith-fixtures` tool exposed by the factory. */
function fixturesTool(filesystem: IFileSystem = fs): McpTool {
  return createFixturesTools(filesystem)[0];
}

describe('createFixturesTools', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-fixtures-'));
  });
  afterEach(() => fsExtra.remove(dir));

  it('exposes a single mutative, write-scoped evolith-fixtures tool', () => {
    const tools = createFixturesTools(fs);
    expect(tools).toHaveLength(1);
    expect(tools[0].schema.name).toBe('evolith-fixtures');
    expect(tools[0].mutative).toBe(true);
    expect(tools[0].scope).toBe('write');
    // enum in the schema advertises every supported fixture type
    const props = tools[0].schema.inputSchema.properties as {
      type: { enum: string[] };
    };
    expect(props.type.enum).toEqual(['demo', 'adr', 'ruleset', 'evolith', 'full']);
  });

  it('writes the evolith fixture and returns the created relative paths', async () => {
    const result = await fixturesTool().execute({ type: 'evolith', dir });

    expect(result).toEqual({
      type: 'evolith',
      targetDir: dir,
      dryRun: false,
      created: ['evolith.yaml'],
    });
    expect(await fs.exists(path.join(dir, 'evolith.yaml'))).toBe(true);
    const content = await fs.readFile(path.join(dir, 'evolith.yaml'));
    expect(content).toContain('coreRef:');
  });

  it('writes the adr fixtures (three ADR files)', async () => {
    const result = (await fixturesTool().execute({ type: 'adr', dir })) as {
      created: string[];
    };

    expect(result.created).toEqual([
      'docs/adr/0001-record-architecture-decisions.md',
      'docs/adr/0002-use-clean-architecture.md',
      'docs/adr/0003-use-nestjs-for-backend.md',
    ]);
    expect(
      await fs.exists(path.join(dir, 'docs/adr/0003-use-nestjs-for-backend.md')),
    ).toBe(true);
  });

  it('writes the ruleset fixtures (two ruleset files)', async () => {
    const result = (await fixturesTool().execute({ type: 'ruleset', dir })) as {
      created: string[];
    };

    expect(result.created).toEqual([
      'rulesets/architecture.yaml',
      'rulesets/naming.yaml',
    ]);
    expect(await fs.exists(path.join(dir, 'rulesets/naming.yaml'))).toBe(true);
  });

  it('defaults to the demo fixture set (evolith + adr) when no type is given', async () => {
    const result = (await fixturesTool().execute({ dir })) as {
      type: string;
      created: string[];
    };

    expect(result.type).toBe('demo');
    expect(result.created).toHaveLength(4);
    expect(result.created).toContain('evolith.yaml');
    expect(result.created).toContain('docs/adr/0001-record-architecture-decisions.md');
  });

  it('writes the full fixture set (evolith + adr + ruleset)', async () => {
    const result = (await fixturesTool().execute({ type: 'full', dir })) as {
      created: string[];
    };

    expect(result.created).toHaveLength(6);
    expect(result.created).toEqual(
      expect.arrayContaining([
        'evolith.yaml',
        'docs/adr/0001-record-architecture-decisions.md',
        'rulesets/architecture.yaml',
        'rulesets/naming.yaml',
      ]),
    );
  });

  it('previews files without touching the filesystem in dryRun mode', async () => {
    const result = (await fixturesTool().execute({
      type: 'full',
      dir,
      dryRun: true,
    })) as { type: string; targetDir: string; dryRun: boolean; created: string[] };

    expect(result.dryRun).toBe(true);
    expect(result.targetDir).toBe(dir);
    expect(result.created).toHaveLength(6);
    // nothing was actually written to the temp directory
    expect(await fsExtra.readdir(dir)).toEqual([]);
  });

  it('defaults the target directory to process.cwd()', async () => {
    const result = (await fixturesTool().execute({
      type: 'evolith',
      dryRun: true,
    })) as { targetDir: string };

    expect(result.targetDir).toBe(process.cwd());
  });

  it('throws on an invalid fixture type', async () => {
    await expect(fixturesTool().execute({ type: 'bogus', dir })).rejects.toThrow(
      'Invalid fixture type: bogus. Valid types: demo, adr, ruleset, evolith, full',
    );
  });

  it('aggregates IO failures into one thrown error (Error and non-Error causes)', async () => {
    const ensureDir = jest.fn().mockResolvedValue(undefined);
    const writeFile = jest
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce('permission denied');
    const failing = { ensureDir, writeFile } as unknown as IFileSystem;

    await expect(
      fixturesTool(failing).execute({ type: 'ruleset', dir }),
    ).rejects.toThrow(
      'Failed to write 2 of 2 fixture file(s): ' +
        'rulesets/architecture.yaml: disk full; ' +
        'rulesets/naming.yaml: permission denied',
    );
    expect(ensureDir).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledTimes(2);
  });
});
