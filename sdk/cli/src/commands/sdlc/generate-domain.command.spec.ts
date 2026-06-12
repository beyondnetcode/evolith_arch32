import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { GenerateDomainCommand } from './generate-domain.command';
import * as p from '@clack/prompts';

const MINIMAL_MODEL = `
# DDD Model

\`\`\`mermaid
classDiagram
  class User {
    <<Entity>>
    +String id
    +String name
  }
\`\`\`
`;

describe('GenerateDomainCommand', () => {
  let command: GenerateDomainCommand;
  let exitSpy: jest.SpyInstance;
  let tmpDir: string;
  let modelFile: string;

  beforeEach(async () => {
    command = new GenerateDomainCommand();
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-gen-cmd-test-'));
    modelFile = path.join(tmpDir, 'model.md');
    await fs.writeFile(modelFile, MINIMAL_MODEL);
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    await fs.remove(tmpDir);
  });

  describe('validation', () => {
    it('shows error when target is missing', async () => {
      await command.run([], { from: modelFile });
      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('generation target')
      );
    });

    it('shows error when from is missing', async () => {
      await command.run(['domain'], {});
      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('source file')
      );
    });

    it('rejects when model file not found', async () => {
      await expect(command.run(['domain'], { from: '/nonexistent/model.md' }))
        .rejects.toThrow('Model file not found');
      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });
  });

  describe('successful generation', () => {
    it('scaffolds Entity file in dry-run mode', async () => {
      await command.run(['domain'], { from: modelFile, output: tmpDir, dryRun: true });

      // dry-run: no files written
      const entityPath = path.join(tmpDir, 'src/domain/entities/User.ts');
      await expect(fs.pathExists(entityPath)).resolves.toBe(false);

      // but reports what would be created
      expect(p.log.success as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Would create')
      );
    });

    it('scaffolds Entity file in real mode', async () => {
      await command.run(['domain'], { from: modelFile, output: tmpDir });

      const entityPath = path.join(tmpDir, 'src/domain/entities/User.ts');
      await expect(fs.pathExists(entityPath)).resolves.toBe(true);

      expect(p.log.success as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Created')
      );
    });

    it('shows p.outro with success message', async () => {
      await command.run(['domain'], { from: modelFile, output: tmpDir });

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('Scaffold complete')
      );
    });

    it('skips existing files on second run', async () => {
      await command.run(['domain'], { from: modelFile, output: tmpDir });
      jest.clearAllMocks();
      await command.run(['domain'], { from: modelFile, output: tmpDir });

      expect(p.log.warn as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Skipped')
      );
    });
  });

  describe('parseFrom / parseOutput / parseDryRun', () => {
    it('parseFrom returns value', () => {
      expect(command.parseFrom('path/to/model.md')).toBe('path/to/model.md');
    });

    it('parseOutput returns value', () => {
      expect(command.parseOutput('./output')).toBe('./output');
    });

    it('parseDryRun returns true', () => {
      expect(command.parseDryRun()).toBe(true);
    });
  });
});
