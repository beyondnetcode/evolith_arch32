import type { IFileSystem, ILogger } from '@evolith/core';
import type { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { createPhaseAdvanceTools } from './phase-advance.tools';
import { DomainException, ErrorCodes } from '../common/errors';

const logger: ILogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as never;

const webhook: IWebhookNotifier = {
  notify: jest.fn(),
} as never;

function fsThatThrows(error: Error): IFileSystem {
  return {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockRejectedValue(error),
    readJson: jest.fn().mockRejectedValue(error),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
  } as unknown as IFileSystem;
}

describe('phase-advance tool', () => {
  const fs = fsThatThrows(new Error('unused')) as IFileSystem;

  it('registers the evolith-phase-advance schema with required inputs', () => {
    const [tool] = createPhaseAdvanceTools(webhook, fs, logger);
    expect(tool.schema.name).toBe('evolith-phase-advance');
    expect(tool.schema.inputSchema.required).toEqual(['fromPhase', 'toPhase', 'projectPath']);
  });

  it('rejects an invalid fromPhase', async () => {
    const [tool] = createPhaseAdvanceTools(webhook, fs, logger);
    await expect(
      tool.execute({ fromPhase: 'bogus', toPhase: 'design', projectPath: '/x' }),
    ).rejects.toMatchObject({ code: ErrorCodes.PHASE_INVALID });
  });

  it('rejects an invalid toPhase', async () => {
    const [tool] = createPhaseAdvanceTools(webhook, fs, logger);
    await expect(
      tool.execute({ fromPhase: 'discovery', toPhase: 'bogus', projectPath: '/x' }),
    ).rejects.toMatchObject({ code: ErrorCodes.PHASE_INVALID });
  });

  it('rejects an empty projectPath', async () => {
    const [tool] = createPhaseAdvanceTools(webhook, fs, logger);
    await expect(
      tool.execute({ fromPhase: 'discovery', toPhase: 'design', projectPath: '' }),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('maps "not found" errors from the use case to RULESET_NOT_FOUND', async () => {
    const enoent = Object.assign(new Error('ENOENT: phase ruleset not found'), { code: 'ENOENT' });
    const [tool] = createPhaseAdvanceTools(webhook, fsThatThrows(enoent), logger);
    await expect(
      tool.execute({ fromPhase: 'discovery', toPhase: 'design', projectPath: '/x' }),
    ).rejects.toMatchObject({ code: ErrorCodes.RULESET_NOT_FOUND });
  });

  it('rethrows unexpected errors verbatim', async () => {
    const boom = new Error('database is down');
    const [tool] = createPhaseAdvanceTools(webhook, fsThatThrows(boom), logger);
    await expect(
      tool.execute({ fromPhase: 'discovery', toPhase: 'design', projectPath: '/x' }),
    ).rejects.toThrow(/database is down/);
  });
});
