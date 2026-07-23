import { scaffoldHexagonal, ScaffoldResult } from './hexagonal-scaffolder';
import type { ClassDiagram } from './mermaid-class-parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('hexagonal-scaffolder', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexagonal-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  function makeDiagram(classes: Array<{ name: string; stereotype: string; properties?: string[] }>): ClassDiagram {
    return {
      classes: classes.map(c => ({
        name: c.name,
        stereotype: c.stereotype as any,
        properties: (c.properties || []).map(p => {
          const [type, name] = p.split(' ');
          return { visibility: 'public' as const, type, name };
        }),
        methods: [],
      })),
      relationships: [],
    };
  }

  describe('scaffoldHexagonal', () => {
    it('creates entity files under src/domain/entities/', async () => {
      const diagram = makeDiagram([{ name: 'User', stereotype: 'Entity', properties: ['String id'] }]);
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.created).toContain('src/domain/entities/User.ts');
      const content = await fs.readFile(path.join(tmpDir, 'src/domain/entities/User.ts'), 'utf-8');
      expect(content).toContain('export class User');
      expect(content).toContain('Domain Entity');
    });

    it('creates value object files under src/domain/value-objects/', async () => {
      const diagram = makeDiagram([{ name: 'Email', stereotype: 'ValueObject', properties: ['String value'] }]);
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.created).toContain('src/domain/value-objects/Email.ts');
      const content = await fs.readFile(path.join(tmpDir, 'src/domain/value-objects/Email.ts'), 'utf-8');
      expect(content).toContain('Value Object');
      expect(content).toContain('private validate()');
    });

    it('creates repository interface and implementation', async () => {
      const diagram = makeDiagram([
        { name: 'User', stereotype: 'Entity' },
        { name: 'UserRepository', stereotype: 'Repository' },
      ]);
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.created).toContain('src/domain/repositories/IUserRepository.ts');
      expect(result.created).toContain('src/infrastructure/persistence/UserRepository.ts');
    });

    it('creates service files under src/domain/services/', async () => {
      const diagram = makeDiagram([{ name: 'AuthService', stereotype: 'Service' }]);
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.created).toContain('src/domain/services/AuthService.ts');
      const content = await fs.readFile(path.join(tmpDir, 'src/domain/services/AuthService.ts'), 'utf-8');
      expect(content).toContain('Domain Service');
    });

    it('skips existing files', async () => {
      // Pre-create a file
      await fs.ensureDir(path.join(tmpDir, 'src/domain/entities'));
      await fs.writeFile(path.join(tmpDir, 'src/domain/entities/User.ts'), 'existing');

      const diagram = makeDiagram([{ name: 'User', stereotype: 'Entity' }]);
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.skipped).toContain('src/domain/entities/User.ts');
      expect(result.created).not.toContain('src/domain/entities/User.ts');
    });

    it('does not write files in dry-run mode', async () => {
      const diagram = makeDiagram([{ name: 'User', stereotype: 'Entity' }]);
      const result = await scaffoldHexagonal(diagram, tmpDir, true);

      expect(result.created).toContain('src/domain/entities/User.ts');
      const exists = await fs.pathExists(path.join(tmpDir, 'src/domain/entities/User.ts'));
      expect(exists).toBe(false);
    });

    it('handles empty diagram', async () => {
      const diagram: ClassDiagram = { classes: [], relationships: [] };
      const result = await scaffoldHexagonal(diagram, tmpDir);

      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });
});
