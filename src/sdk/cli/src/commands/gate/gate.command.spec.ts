import { GateCommand } from './gate.command';
import type { EvaluateGateUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/evaluate-gate.use-case';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import type { ConfigService } from '../../infrastructure/config/config.service';

jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id, magenta: id, white: id, blueBright: id, redBright: id, dim: id };
});

function makeEvidence(verdict: 'passed' | 'failed' | 'skipped' = 'passed') {
  return {
    gateId: 'g1',
    phase: 'design',
    rulesetRef: 'rs',
    rulesetVersion: '1.0.0',
    verdict,
    violations: verdict === 'passed' ? [] : [
      { ruleId: 'R1', severity: 'error', location: 'src/x', message: 'boom' },
    ],
    evaluatedBy: 'human',
    evaluatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setup(verdict: 'passed' | 'failed' | 'skipped' = 'passed', shouldThrow?: Error) {
  const execute = shouldThrow
    ? jest.fn().mockRejectedValue(shouldThrow)
    : jest.fn().mockResolvedValue(makeEvidence(verdict));
  const useCase = { execute } as unknown as EvaluateGateUseCase;
  const prompt = {
    showIntro: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
    showOutro: jest.fn(),
    showError: jest.fn(),
    stopSpinner: jest.fn(),
  } as unknown as PromptService;
  const config = { getProfile: () => ({ initiative: undefined, tenant: undefined }) } as unknown as ConfigService;
  const command = new GateCommand(useCase, prompt, config);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  return { command, useCase, execute, prompt, log, exit };
}

describe('GateCommand', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects unknown actions in json mode with VALIDATION_FAILED envelope', async () => {
    const { command, log, exit } = setup();
    await command.executeCommand(['bogus'], { format: 'json' });
    const body = JSON.parse(log.mock.calls[0][0] as string);
    expect(body).toMatchObject({ success: false, error: { code: 'VALIDATION_FAILED' } });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('throws in human mode when the action is unknown', async () => {
    const { command } = setup();
    await expect(command.executeCommand(['nope'], {})).rejects.toThrow(/Unknown gate action/);
  });

  it('rejects an invalid --phase with INVALID_PHASE', async () => {
    const { command, log, exit } = setup();
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'bogus' });
    const body = JSON.parse(log.mock.calls[0][0] as string);
    expect(body.error.code).toBe('INVALID_PHASE');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('rejects an invalid --evaluated-by with VALIDATION_FAILED', async () => {
    const { command, log, exit } = setup();
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design', evaluatedBy: 'bot' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('VALIDATION_FAILED');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('maps "ruleset" errors from the use case to RULESET_NOT_FOUND', async () => {
    const { command, log, exit } = setup('passed', new Error('ruleset missing for phase'));
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('RULESET_NOT_FOUND');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('maps other use-case errors to INTERNAL_ERROR', async () => {
    const { command, log, exit } = setup('passed', new Error('database is down'));
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design' });
    expect(JSON.parse(log.mock.calls[0][0] as string).error.code).toBe('INTERNAL_ERROR');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints a success envelope and does not exit when verdict is passed', async () => {
    const { command, log, exit } = setup('passed');
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design' });
    const body = JSON.parse(log.mock.calls[0][0] as string);
    expect(body.success).toBe(true);
    expect(body.data.verdict).toBe('passed');
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits 1 when verdict is failed (json mode)', async () => {
    const { command, exit } = setup('failed');
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design' });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints a human report when --format is not json', async () => {
    const { command, prompt } = setup('passed');
    await command.executeCommand(['evaluate'], { phase: 'design' });
    expect(prompt.showIntro).toHaveBeenCalledWith(expect.stringContaining('Gate g1'));
    expect(prompt.showSuccess).toHaveBeenCalledWith('No violations.');
  });

  it('prints violations in human mode when verdict is failed', async () => {
    const { command, prompt, exit } = setup('failed');
    await command.executeCommand(['evaluate'], { phase: 'design' });
    expect(prompt.showWarning).toHaveBeenCalledWith(expect.stringContaining('R1'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('echoes initiative/tenant context into meta when provided via options', async () => {
    const { command, log } = setup('passed');
    await command.executeCommand(['evaluate'], {
      format: 'json',
      phase: 'design',
      initiative: 'INIT-1',
      tenant: 'TEN-1',
    });
    const body = JSON.parse(log.mock.calls[0][0] as string);
    expect(body.meta.context).toMatchObject({ initiative: 'INIT-1', tenant: 'TEN-1', phase: 'design' });
  });

  it('uses cwd as project path by default and passes corePath through', async () => {
    const { command, execute } = setup('passed');
    await command.executeCommand(['evaluate'], { format: 'json', phase: 'design', core: '/c' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ projectPath: process.cwd(), corePath: '/c' }));
  });

  describe('option parsers', () => {
    const c = new GateCommand({} as never, undefined as never, undefined);
    it('each parser returns its input verbatim', () => {
      expect(c.parsePhase('design')).toBe('design');
      expect(c.parseProject('/p')).toBe('/p');
      expect(c.parseCore('/c')).toBe('/c');
      expect(c.parseFormat('json')).toBe('json');
      expect(c.parseEvaluatedBy('agent')).toBe('agent');
      expect(c.parseInitiative('i')).toBe('i');
      expect(c.parseTenant('t')).toBe('t');
      expect(c.parseWebhookUrl('http://u')).toBe('http://u');
    });
  });
});
