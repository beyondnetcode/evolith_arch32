/**
 * GT-571 -- the first 60 seconds of the product.
 *
 * The README quickstart is `evolith init` followed by `evolith validate`, and it
 * failed three times over: the published bin map declared only `evolith-cli`, the
 * program self-identified as `main` in every help/usage line, and `init` wrote
 * into a subdirectory so the `validate` that follows targeted the parent.
 *
 * This spec pins the invocation contract end to end against the real command
 * graph. It lives beside the init command because that is the surface the
 * quickstart exercises.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CommandFactory } from 'nest-commander';
import { Module, type INestApplicationContext } from '@nestjs/common';
import { applyProgramName, CLI_PROGRAM_NAME } from '../../main';
import { InitCommand } from './init.command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

/**
 * The real `InitCommand` under a real nest-commander program, with only its
 * collaborators stubbed. The whole `AppModule` is deliberately NOT booted here:
 * this spec must fail for quickstart reasons only.
 */
@Module({
  providers: [
    InitCommand,
    PromptService,
    { provide: CatalogLoader, useValue: {} },
    { provide: 'IFileSystem', useValue: {} },
  ],
})
class QuickstartModule {}

/**
 * Structural view of the commander program: the workspace root hoists a
 * different major of `commander` than the one nest-commander runs on, so its
 * published typings cannot be used as the contract here.
 */
interface ProgramLike {
  name(): string;
  helpInformation(): string;
  commands: ProgramLike[];
}

const PKG_PATH = join(__dirname, '..', '..', '..', 'package.json');
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as {
  bin: Record<string, string>;
  main: string;
};

describe('quickstart contract (GT-571)', () => {
  describe('bin map', () => {
    it('publishes the `evolith` command the documentation actually invokes', () => {
      expect(Object.keys(pkg.bin)).toContain('evolith');
    });

    it('keeps `evolith-cli` so existing installs and scripts do not break', () => {
      expect(Object.keys(pkg.bin)).toContain('evolith-cli');
    });

    it('points both names at the same entrypoint', () => {
      expect(pkg.bin['evolith']).toBe(pkg.bin['evolith-cli']);
      expect(pkg.bin['evolith']).toContain('main.js');
    });
  });

  describe('program name', () => {
    let app: INestApplicationContext;
    let program: ProgramLike;

    beforeAll(async () => {
      app = await CommandFactory.createWithoutRunning(QuickstartModule, { logger: false });
      applyProgramName(app);
      // Resolved the same way `bootstrap()` does, through the token nest-commander
      // registers the root program under.
      program = app.get<ProgramLike>(
        require('nest-commander/src/constants').Commander,
        { strict: false },
      );
    }, 60000);

    afterAll(async () => {
      await app?.close();
    });

    it('names the root program after the documented command, not the script file', () => {
      expect(CLI_PROGRAM_NAME).toBe('evolith');
      expect(program.name()).toBe('evolith');
      expect(program.name()).not.toBe('main');
    });

    it('`init --help` prints the real command in its usage line', () => {
      const init = program.commands.find((c: ProgramLike) => c.name() === 'init');
      expect(init).toBeDefined();
      const help = (init as ProgramLike).helpInformation();
      expect(help).toContain('Usage: evolith init');
      expect(help).not.toContain('Usage: main init');
    });

    it('exposes the optional target directory in `init --help`', () => {
      const init = program.commands.find((c: ProgramLike) => c.name() === 'init') as ProgramLike;
      expect(init.helpInformation()).toContain('[directory]');
    });
  });

  describe('applyProgramName', () => {
    it('reports failure instead of throwing when the program cannot be resolved', () => {
      const brokenApp = {
        get: () => {
          throw new Error('no such provider');
        },
      } as unknown as INestApplicationContext;
      expect(applyProgramName(brokenApp)).toBe(false);
    });
  });
});
