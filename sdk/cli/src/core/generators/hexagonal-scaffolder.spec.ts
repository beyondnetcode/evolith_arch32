import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { scaffoldHexagonal } from './hexagonal-scaffolder';
import { parseClassDiagram } from './mermaid-class-parser';

const DIAGRAM_SRC = `
classDiagram
  class User {
    <<Entity>>
    +String id
    +String name
    +validate() void
  }

  class Email {
    <<Value Object>>
    +String value
    +isValid() bool
  }

  class Order {
    <<Aggregate>>
    +String orderId
  }

  class UserRepository {
    <<Repository>>
    +findById(id String) User
    +save(user User) void
  }

  class EmailService {
    <<Service>>
    +sendConfirmation(email String) void
  }

  UserRepository --> User
`;

describe('scaffoldHexagonal', () => {
  let tmpDir: string;
  let diagram: ReturnType<typeof parseClassDiagram>;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-scaffold-test-'));
    diagram = parseClassDiagram(DIAGRAM_SRC)!;
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('parses diagram to 5 classes', () => {
    expect(diagram.classes).toHaveLength(5);
  });

  describe('dryRun mode', () => {
    it('returns created list without writing files', async () => {
      const result = await scaffoldHexagonal(diagram, tmpDir, true);
      expect(result.created.length).toBeGreaterThan(0);
      expect(result.skipped).toHaveLength(0);

      // dry-run must not create anything
      const exists = await fs.pathExists(path.join(tmpDir, 'src'));
      expect(exists).toBe(false);
    });
  });

  describe('real write mode', () => {
    let result: Awaited<ReturnType<typeof scaffoldHexagonal>>;

    beforeAll(async () => {
      result = await scaffoldHexagonal(diagram, tmpDir);
    });

    it('creates Entity file', async () => {
      const p = path.join(tmpDir, 'src/domain/entities/User.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('creates ValueObject file', async () => {
      const p = path.join(tmpDir, 'src/domain/value-objects/Email.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('creates Aggregate file', async () => {
      const p = path.join(tmpDir, 'src/domain/entities/Order.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('creates Repository interface', async () => {
      const p = path.join(tmpDir, 'src/domain/repositories/IUserRepository.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('creates Repository implementation', async () => {
      const p = path.join(tmpDir, 'src/infrastructure/persistence/UserRepository.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('creates Service file', async () => {
      const p = path.join(tmpDir, 'src/domain/services/EmailService.ts');
      await expect(fs.pathExists(p)).resolves.toBe(true);
    });

    it('reports all files as created', () => {
      // Entity + VO + Aggregate + Repo interface + Repo impl + Service = 6
      expect(result.created).toHaveLength(6);
      expect(result.skipped).toHaveLength(0);
    });

    it('Entity file contains class declaration and constructor', async () => {
      const content = await fs.readFile(
        path.join(tmpDir, 'src/domain/entities/User.ts'), 'utf-8'
      );
      expect(content).toContain('export class User');
      expect(content).toContain('constructor(');
      expect(content).toContain('id: string');
    });

    it('ValueObject file contains validate() method', async () => {
      const content = await fs.readFile(
        path.join(tmpDir, 'src/domain/value-objects/Email.ts'), 'utf-8'
      );
      expect(content).toContain('export class Email');
      expect(content).toContain('private validate()');
      expect(content).toContain('this.validate()');
    });

    it('Aggregate file contains domainEvents', async () => {
      const content = await fs.readFile(
        path.join(tmpDir, 'src/domain/entities/Order.ts'), 'utf-8'
      );
      expect(content).toContain('domainEvents');
      expect(content).toContain('addDomainEvent');
    });

    it('Repository interface imports entity and has findById/save', async () => {
      const content = await fs.readFile(
        path.join(tmpDir, 'src/domain/repositories/IUserRepository.ts'), 'utf-8'
      );
      expect(content).toContain('import type { User }');
      expect(content).toContain('findById');
      expect(content).toContain('save');
    });

    it('Repository impl implements the interface', async () => {
      const content = await fs.readFile(
        path.join(tmpDir, 'src/infrastructure/persistence/UserRepository.ts'), 'utf-8'
      );
      expect(content).toContain('implements IUserRepository');
      expect(content).toContain('Not implemented');
    });

    it('skips existing files on second run', async () => {
      const result2 = await scaffoldHexagonal(diagram, tmpDir);
      expect(result2.created).toHaveLength(0);
      expect(result2.skipped).toHaveLength(6);
    });
  });
});
