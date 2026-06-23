jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id, magenta: id, white: id };
});

const mockExecute = jest.fn();
jest.mock('@evolith/core-domain/application/services', () => ({
  InitializeProjectUseCase: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

import { InitWizardCommand } from './init.wizard';
import type { WizardService } from '../../infrastructure/prompts/wizard.service';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import type { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import type { IFileSystem } from '@evolith/core-domain/domain/interfaces';

function setup(wizardResult: unknown, executeResult: unknown = { success: true, artifacts: [{}, {}, {}] }) {
  mockExecute.mockReset();
  mockExecute.mockResolvedValue(executeResult);
  const wizardService = { start: jest.fn().mockResolvedValue(wizardResult) } as unknown as WizardService;
  const prompt = {
    startSpinner: jest.fn(),
    stopSpinner: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    text: jest.fn(),
    select: jest.fn(),
  } as unknown as PromptService;
  const catalog = {} as CatalogLoader;
  const fs = {} as IFileSystem;
  const cmd = new InitWizardCommand(wizardService, prompt, catalog, fs);
  return { cmd, wizardService, prompt };
}

describe('InitWizardCommand', () => {
  it('logs a hint and exits early when --no-wizard is set', async () => {
    const { cmd, wizardService } = setup({});
    const logSpy = jest.spyOn((cmd as unknown as { logger: { log: jest.Mock } }).logger, 'log').mockImplementation(() => undefined);
    await cmd.executeCommand([], { wizard: false });
    expect(wizardService.start).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('evolith init'));
  });

  it('runs the wizard, calls the use case, and reports success', async () => {
    const { cmd, wizardService, prompt } = setup({ projectName: 'evo', runtime: 'nodejs', monorepo: 'npm', arch: 'hexagonal' });
    await cmd.executeCommand([]);
    expect(wizardService.start).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('Wizard'),
      steps: expect.any(Array),
      noInteractive: false,
    }));
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({
      name: 'evo', runtime: 'nodejs', monorepo: 'npm', architecture: 'hexagonal',
    }), expect.any(String));
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('evo'));
    expect(prompt.showInfo).toHaveBeenCalledWith(expect.stringContaining('3'));
  });

  it('reports failure when the use case returns success=false', async () => {
    const { cmd, prompt } = setup({ projectName: 'evo' }, { success: false, artifacts: [] });
    await cmd.executeCommand([]);
    expect(prompt.showError).toHaveBeenCalledWith('Failed to create project');
  });

  it('does not call the use case when the wizard returns no project name', async () => {
    const { cmd } = setup({ projectName: '' });
    await cmd.executeCommand([]);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('passes --no-interactive through to the wizard service', async () => {
    const { cmd, wizardService } = setup({ projectName: 'evo' });
    await cmd.executeCommand([], { noInteractive: true });
    expect(wizardService.start).toHaveBeenCalledWith(expect.objectContaining({ noInteractive: true }));
  });

  it('swallows UserCancelledError without rethrowing', async () => {
    const wizardService = { start: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'UserCancelledError' })) } as unknown as WizardService;
    const prompt = {
      startSpinner: jest.fn(), stopSpinner: jest.fn(), showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn(),
      text: jest.fn(), select: jest.fn(),
    } as unknown as PromptService;
    const cmd = new InitWizardCommand(wizardService, prompt, {} as CatalogLoader, {} as IFileSystem);
    await expect(cmd.executeCommand([])).resolves.toBeUndefined();
    expect(prompt.showInfo).toHaveBeenCalledWith('Initialization cancelled');
  });

  it('rethrows non-cancellation errors from the wizard', async () => {
    const wizardService = { start: jest.fn().mockRejectedValue(new Error('boom')) } as unknown as WizardService;
    const prompt = {
      startSpinner: jest.fn(), stopSpinner: jest.fn(), showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn(),
      text: jest.fn(), select: jest.fn(),
    } as unknown as PromptService;
    const cmd = new InitWizardCommand(wizardService, prompt, {} as CatalogLoader, {} as IFileSystem);
    await expect(cmd.executeCommand([])).rejects.toThrow('boom');
  });

  it('wires four wizard steps that delegate to PromptService.text/select', async () => {
    const { cmd, wizardService, prompt } = setup({ projectName: 'evo' });
    (prompt.text as jest.Mock).mockResolvedValue('p');
    (prompt.select as jest.Mock).mockResolvedValue('s');
    await cmd.executeCommand([]);
    const cfg = (wizardService.start as jest.Mock).mock.calls[0][0];
    expect(cfg.steps.map((s: { id: string }) => s.id)).toEqual(['project-name', 'runtime', 'monorepo', 'architecture']);
    expect(await cfg.steps[0].run()).toEqual({ projectName: 'p' });
    expect(await cfg.steps[1].run()).toEqual({ runtime: 's' });
    expect(await cfg.steps[2].run()).toEqual({ monorepo: 's' });
    expect(await cfg.steps[3].run()).toEqual({ arch: 's' });
  });

  it('project-name validate rejects names shorter than 3 chars', async () => {
    const { cmd, wizardService, prompt } = setup({ projectName: 'evo' });
    (prompt.text as jest.Mock).mockImplementation(async (opts: { validate?: (v: string) => string | undefined }) => {
      return opts.validate;
    });
    await cmd.executeCommand([]);
    const cfg = (wizardService.start as jest.Mock).mock.calls[0][0];
    const { projectName: validate } = await cfg.steps[0].run();
    expect(validate('')).toMatch(/at least 3/);
    expect(validate('ok')).toMatch(/at least 3/);
    expect(validate('okay')).toBeUndefined();
  });

  it('option parsers return true', () => {
    const { cmd } = setup({});
    expect(cmd.parseNoWizard()).toBe(true);
    expect(cmd.parseNoInteractive()).toBe(true);
  });
});
