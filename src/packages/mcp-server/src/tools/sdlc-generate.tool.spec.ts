import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { SdlcGenerateTool } from './sdlc-generate.tool';

const MODEL = [
  '# DDD Model',
  '',
  '```mermaid',
  'classDiagram',
  '  class User {',
  '    <<Entity>>',
  '    +String id',
  '    +String email',
  '    +activate() void',
  '  }',
  '  class Email {',
  '    <<ValueObject>>',
  '    +String value',
  '    +validate() void',
  '  }',
  '  class Order {',
  '    <<Aggregate>>',
  '    +String id',
  '    +addItem(item String) void',
  '  }',
  '  class UserRepository {',
  '    <<Repository>>',
  '    +findById(id String) User',
  '  }',
  '  class NotificationService {',
  '    <<Service>>',
  '    +notify(user User) void',
  '  }',
  '  UserRepository --> User',
  '```',
  '',
].join('\n');

describe('SdlcGenerateTool', () => {
  let dir: string;
  let tool: SdlcGenerateTool;

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-sdlc-gen-'));
    tool = new SdlcGenerateTool();
  });
  afterEach(() => fsExtra.remove(dir));

  it('declares a mutative write-scoped schema', () => {
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
    expect(tool.schema.name).toBe('evolith-sdlc-generate');
  });

  it('throws when neither model nor from is provided', async () => {
    await expect(tool.execute({ output: dir })).rejects.toThrow(
      'Either `model` (inline Markdown) or `from` (file path) must be provided.',
    );
  });

  it('throws when the model contains no valid classDiagram', async () => {
    await expect(
      tool.execute({ model: '# Just prose, no mermaid block here.', output: dir }),
    ).rejects.toThrow('No valid Mermaid classDiagram found');
  });

  it('throws when the from file does not exist', async () => {
    await expect(tool.execute({ from: 'missing-model.md', output: dir })).rejects.toThrow(
      /Model file not found:/,
    );
  });

  it('scaffolds from an inline model and writes files to disk', async () => {
    const result = (await tool.execute({ model: MODEL, output: dir })) as {
      targetDir: string;
      dryRun: boolean;
      diagram: {
        classCount: number;
        relationshipCount: number;
        classes: { name: string; stereotype: string }[];
      };
      created: string[];
      skipped: string[];
    };

    expect(result.targetDir).toBe(dir);
    expect(result.dryRun).toBe(false);
    expect(result.diagram.classCount).toBe(5);
    expect(result.diagram.relationshipCount).toBe(1);
    expect(result.diagram.classes).toEqual(
      expect.arrayContaining([
        { name: 'User', stereotype: 'Entity' },
        { name: 'Email', stereotype: 'ValueObject' },
        { name: 'Order', stereotype: 'Aggregate' },
        { name: 'UserRepository', stereotype: 'Repository' },
        { name: 'NotificationService', stereotype: 'Service' },
      ]),
    );
    expect(result.created.length).toBeGreaterThan(0);
    expect(result.skipped).toEqual([]);
    expect(await fsExtra.pathExists(path.join(dir, 'src/domain/entities/User.ts'))).toBe(true);
    expect(
      await fsExtra.pathExists(path.join(dir, 'src/domain/repositories/IUserRepository.ts')),
    ).toBe(true);
  });

  it('reports skipped files on a second scaffold over the same target', async () => {
    await tool.execute({ model: MODEL, output: dir });
    const result = (await tool.execute({ model: MODEL, output: dir })) as {
      created: string[];
      skipped: string[];
    };
    expect(result.created).toEqual([]);
    expect(result.skipped.length).toBeGreaterThan(0);
  });

  it('does not write files when dryRun is true (and defaults target to cwd)', async () => {
    const result = (await tool.execute({ model: MODEL, dryRun: true })) as {
      targetDir: string;
      dryRun: boolean;
      created: string[];
    };
    expect(result.dryRun).toBe(true);
    expect(result.targetDir).toBe(process.cwd());
    expect(result.created.length).toBeGreaterThan(0);
    // dryRun must not touch the filesystem under cwd.
    expect(await fsExtra.pathExists(path.join(process.cwd(), 'src/domain/entities/User.ts'))).toBe(
      false,
    );
  });

  it('scaffolds from a markdown file resolved against the output dir', async () => {
    await fsExtra.writeFile(path.join(dir, 'model.md'), MODEL, 'utf-8');
    const result = (await tool.execute({ from: 'model.md', output: dir })) as {
      targetDir: string;
      diagram: { classCount: number };
      created: string[];
    };
    expect(result.targetDir).toBe(dir);
    expect(result.diagram.classCount).toBe(5);
    expect(result.created.length).toBeGreaterThan(0);
    expect(await fsExtra.pathExists(path.join(dir, 'src/domain/value-objects/Email.ts'))).toBe(true);
  });
});
