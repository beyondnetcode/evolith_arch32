import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { DocsScaffoldTool } from './docs-scaffold.tool';

const ALL_FILES = ['README.md', 'AGENTS.md', 'MASTER_INDEX.md', 'evolith.yaml'];
const MINIMAL_FILES = ['README.md', 'AGENTS.md'];

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe('DocsScaffoldTool', () => {
  let dir: string;
  let tool: DocsScaffoldTool;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-docs-'));
    tool = new DocsScaffoldTool();
  });
  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  it('declares a mutative, write-scoped schema', () => {
    expect(tool.schema.name).toBe('evolith-docs-scaffold');
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
  });

  it('scaffolds the full default template set into an empty directory', async () => {
    const result = (await tool.execute({ path: dir })) as {
      targetDir: string;
      created: number;
      updated: number;
      skipped: number;
      files: string[];
      skippedFiles: string[];
    };

    expect(result).toEqual({
      targetDir: dir,
      created: 4,
      updated: 0,
      skipped: 0,
      files: ALL_FILES,
      skippedFiles: [],
    });
    for (const f of ALL_FILES) {
      expect(await pathExists(path.join(dir, f))).toBe(true);
    }
    const readme = await fs.readFile(path.join(dir, 'README.md'), 'utf-8');
    expect(readme).toContain('# Project Name');
    const contract = await fs.readFile(path.join(dir, 'evolith.yaml'), 'utf-8');
    expect(contract).toContain('apiVersion: evolith.dev/v1');
  });

  it('scaffolds only README.md + AGENTS.md for the minimal template', async () => {
    const result = (await tool.execute({ path: dir, template: 'minimal' })) as {
      created: number;
      files: string[];
    };

    expect(result.created).toBe(2);
    expect(result.files).toEqual(MINIMAL_FILES);
    expect(await pathExists(path.join(dir, 'MASTER_INDEX.md'))).toBe(false);
    expect(await pathExists(path.join(dir, 'evolith.yaml'))).toBe(false);
  });

  it('skips files that already exist when force is not set', async () => {
    await tool.execute({ path: dir });

    const result = (await tool.execute({ path: dir })) as {
      created: number;
      updated: number;
      skipped: number;
      files: string[];
      skippedFiles: string[];
    };

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(4);
    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual(ALL_FILES);
  });

  it('overwrites existing files as updates when force is set', async () => {
    await tool.execute({ path: dir });
    await fs.writeFile(path.join(dir, 'README.md'), 'stale content', 'utf-8');

    const result = (await tool.execute({ path: dir, force: true })) as {
      created: number;
      updated: number;
      skipped: number;
      files: string[];
    };

    expect(result.created).toBe(0);
    expect(result.updated).toBe(4);
    expect(result.skipped).toBe(0);
    expect(result.files).toEqual(ALL_FILES);
    // the stale README was overwritten with the template body
    const readme = await fs.readFile(path.join(dir, 'README.md'), 'utf-8');
    expect(readme).toContain('# Project Name');
  });

  it('computes a create plan in dryRun mode without writing files', async () => {
    const result = (await tool.execute({ path: dir, dryRun: true })) as {
      dryRun: boolean;
      targetDir: string;
      toCreate: string[];
      toUpdate: string[];
      skipped: string[];
      plan: Array<{ filename: string; description: string }>;
    };

    expect(result.dryRun).toBe(true);
    expect(result.targetDir).toBe(dir);
    expect(result.toCreate).toEqual(ALL_FILES);
    expect(result.toUpdate).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.plan).toHaveLength(4);
    expect(result.plan[0]).toEqual({
      filename: 'README.md',
      description: 'Project overview and getting started',
    });
    // dryRun must not write anything
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('reports skips and updates in dryRun mode based on existing files and force', async () => {
    await tool.execute({ path: dir });

    const skipPlan = (await tool.execute({ path: dir, dryRun: true })) as {
      toCreate: string[];
      toUpdate: string[];
      skipped: string[];
      plan: unknown[];
    };
    expect(skipPlan.toCreate).toEqual([]);
    expect(skipPlan.toUpdate).toEqual([]);
    expect(skipPlan.skipped).toEqual(ALL_FILES);
    expect(skipPlan.plan).toEqual([]);

    const updatePlan = (await tool.execute({
      path: dir,
      dryRun: true,
      force: true,
    })) as {
      toCreate: string[];
      toUpdate: string[];
      skipped: string[];
      plan: unknown[];
    };
    expect(updatePlan.toUpdate).toEqual(ALL_FILES);
    expect(updatePlan.toCreate).toEqual([]);
    expect(updatePlan.skipped).toEqual([]);
    expect(updatePlan.plan).toHaveLength(4);
  });

  it('defaults the target directory to process.cwd()', async () => {
    const result = (await tool.execute({ dryRun: true })) as {
      targetDir: string;
      dryRun: boolean;
    };

    expect(result.dryRun).toBe(true);
    expect(result.targetDir).toBe(process.cwd());
  });
});
