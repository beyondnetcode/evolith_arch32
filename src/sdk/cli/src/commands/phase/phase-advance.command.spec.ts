import { PhaseAdvanceCommand } from './phase-advance.command';
import type { ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases/propose-phase-advance.use-case';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';

jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id, magenta: id, white: id, blueBright: id, redBright: id, dim: id };
});

function makeProposal(isRecommended = true) {
  return {
    fromPhase: 'discovery',
    toPhase: 'design',
    evidence: {
      gateId: 'g1',
      phase: 'discovery',
      rulesetRef: 'rs',
      rulesetVersion: '1.0.0',
      verdict: isRecommended ? 'passed' : 'failed',
      violations: isRecommended ? [] : [{ ruleId: 'R1', severity: 'error', location: 'src/x', message: 'boom' }],
      evaluatedBy: 'agent',
      evaluatedAt: '2026-01-01T00:00:00.000Z',
    },
    isRecommended,
    proposedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setup(isRecommended = true, shouldThrow?: Error) {
  const execute = shouldThrow
    ? jest.fn().mockRejectedValue(shouldThrow)
    : jest.fn().mockResolvedValue(makeProposal(isRecommended));
  const useCase = { execute } as unknown as ProposePhaseAdvanceUseCase;
  const prompt = {
    showIntro: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
    showOutro: jest.fn(),
  } as unknown as PromptService;
  const command = new PhaseAdvanceCommand(useCase, prompt);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  return { command, execute, prompt, log, exit };
}

describe('PhaseAdvanceCommand', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects an unknown action with VALIDATION_FAILED in json mode', async () => {
    const { command, log, exit } = setup();
    await command.executeCommand(['bogus'], { format: 'json' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('VALIDATION_FAILED');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('throws in human mode when the action is unknown', async () => {
    const { command } = setup();
    await expect(command.executeCommand(['nope'], {})).rejects.toThrow(/Unknown phase action/);
  });

  it('rejects an invalid --from with INVALID_PHASE', async () => {
    const { command, log } = setup();
    await command.executeCommand(['advance'], { format: 'json', from: 'bogus', to: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('INVALID_PHASE');
  });

  it('rejects an invalid --to with INVALID_PHASE', async () => {
    const { command, log } = setup();
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'bogus' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('INVALID_PHASE');
  });

  it('rejects an invalid --evaluated-by with VALIDATION_FAILED', async () => {
    const { command, log } = setup();
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design', evaluatedBy: 'bot' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('VALIDATION_FAILED');
  });

  it('maps "ruleset" errors to RULESET_NOT_FOUND', async () => {
    const { command, log } = setup(true, new Error('ruleset missing'));
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('RULESET_NOT_FOUND');
  });

  it('maps other use-case errors to INTERNAL_ERROR', async () => {
    const { command, log } = setup(true, new Error('boom'));
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('INTERNAL_ERROR');
  });

  it('emits a success envelope and does not exit when proposal is recommended', async () => {
    const { command, log, exit } = setup(true);
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).success).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits 1 when proposal is not recommended (json mode)', async () => {
    const { command, exit } = setup(false);
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design' });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints human report with violations when proposal is not recommended', async () => {
    const { command, prompt } = setup(false);
    await command.executeCommand(['advance'], { from: 'discovery', to: 'design' });
    expect(prompt.showWarning).toHaveBeenCalledWith(expect.stringContaining('R1'));
  });

  it('prints success message when no violations exist (human)', async () => {
    const { command, prompt } = setup(true);
    await command.executeCommand(['advance'], { from: 'discovery', to: 'design' });
    expect(prompt.showSuccess).toHaveBeenCalledWith('No blocking violations found.');
  });

  it('forwards initiative/tenant into meta.context', async () => {
    const { command, log } = setup(true);
    await command.executeCommand(['advance'], {
      format: 'json', from: 'discovery', to: 'design', initiative: 'I', tenant: 'T',
    });
    expect(JSON.parse(log.mock.calls[0][0] as string).meta.context).toMatchObject({ initiative: 'I', tenant: 'T' });
  });

  it('falls back to cwd for projectPath when --project is absent', async () => {
    const { command, execute } = setup(true);
    await command.executeCommand(['advance'], { format: 'json', from: 'discovery', to: 'design', core: '/c' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ projectPath: process.cwd(), corePath: '/c' }));
  });

  describe('option parsers', () => {
    const c = new PhaseAdvanceCommand({} as never, {} as never);
    it('each parser returns its input verbatim', () => {
      expect(c.parseFrom('a')).toBe('a');
      expect(c.parseTo('a')).toBe('a');
      expect(c.parseProject('a')).toBe('a');
      expect(c.parseCore('a')).toBe('a');
      expect(c.parseFormat('a')).toBe('a');
      expect(c.parseEvaluatedBy('a')).toBe('a');
      expect(c.parseInitiative('a')).toBe('a');
      expect(c.parseTenant('a')).toBe('a');
      expect(c.parseWebhookUrl('a')).toBe('a');
    });
  });
});
