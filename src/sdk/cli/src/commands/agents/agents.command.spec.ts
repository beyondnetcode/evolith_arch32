jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id };
});

const mockInstall = jest.fn();
const mockDiscover = jest.fn();
const mockUnregister = jest.fn();
const mockGetAgent = jest.fn();
const mockUpdateAgent = jest.fn();
const mockUpdateLastValidated = jest.fn();
jest.mock('../../infrastructure/adapters/agent-registry.service', () => ({
  AgentRegistryService: jest.fn().mockImplementation(() => ({
    installAgent: mockInstall,
    discover: mockDiscover,
    unregister: mockUnregister,
    getAgent: mockGetAgent,
    updateAgent: mockUpdateAgent,
    updateLastValidated: mockUpdateLastValidated,
  })),
}));

const mockFsExists = jest.fn();
const mockFsReadJson = jest.fn();
jest.mock('../../infrastructure/providers/node-filesystem.provider', () => ({
  NodeFileSystemProvider: jest.fn().mockImplementation(() => ({
    createFileSystem: () => ({ exists: mockFsExists, readJson: mockFsReadJson }),
  })),
}));

import { AgentsCommand } from './agents.command';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';

function makePrompt(overrides: Partial<Record<keyof PromptService, jest.Mock>> = {}): PromptService {
  return {
    showIntro: jest.fn(),
    showOutro: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    text: jest.fn(),
    select: jest.fn(),
    multiselect: jest.fn(),
    confirm: jest.fn(),
    ...overrides,
  } as unknown as PromptService;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'clear').mockImplementation(() => undefined);
});

describe('AgentsCommand — dispatch', () => {
  it.each([
    ['install'],
    ['list'],
    ['validate'],
    ['upgrade'],
    ['remove'],
  ])('routes `%s` to discover/install path', async (action) => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([action]);
    // Each non-install branch hits discover() at least once; install hits text/select.
    if (action === 'install') {
      expect(prompt.text).toHaveBeenCalled();
    } else {
      expect(mockDiscover).toHaveBeenCalled();
    }
  });

  it('default action shows the menu and routes by selection', async () => {
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('list') });
    mockDiscover.mockResolvedValue([]);
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([]);
    expect(prompt.showIntro).toHaveBeenCalledWith('Evolith SDK - Agent Management');
    expect(mockDiscover).toHaveBeenCalled();
  });

  it('menu exit selection returns without dispatching', async () => {
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('exit') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([]);
    expect(prompt.showOutro).toHaveBeenCalled();
    expect(mockDiscover).not.toHaveBeenCalled();
  });

  it.each(['install', 'list', 'validate', 'upgrade', 'remove'])(
    'menu dispatches to %s when selected',
    async (selection) => {
      mockDiscover.mockResolvedValue([]);
      const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce(selection) });
      const cmd = new AgentsCommand(prompt);
      await cmd.executeCommand([]);
      if (selection === 'install') {
        expect(prompt.text).toHaveBeenCalled();
      } else {
        expect(mockDiscover).toHaveBeenCalled();
      }
    },
  );
});

describe('AgentsCommand — install', () => {
  it('installs an agent when the user confirms', async () => {
    const prompt = makePrompt({
      text: jest.fn().mockResolvedValueOnce('my-agent').mockResolvedValueOnce('desc'),
      select: jest.fn().mockResolvedValueOnce('standard'),
      multiselect: jest.fn().mockResolvedValueOnce(['adr-0002']).mockResolvedValueOnce(['acl']),
      confirm: jest.fn().mockResolvedValueOnce(true),
    });
    mockInstall.mockResolvedValue(undefined);
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['install']);
    expect(mockInstall).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'my-agent', template: 'standard' }),
      expect.objectContaining({ principles: expect.any(Array) }),
    );
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('my-agent'));
  });

  it('cancels install when confirm is false', async () => {
    const prompt = makePrompt({
      text: jest.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('d'),
      select: jest.fn().mockResolvedValueOnce('minimal'),
      multiselect: jest.fn().mockResolvedValue([]),
      confirm: jest.fn().mockResolvedValueOnce(false),
    });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['install']);
    expect(mockInstall).not.toHaveBeenCalled();
    expect(prompt.showOutro).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
  });

  it('agent-name validator rejects bad inputs', async () => {
    let validate: undefined | ((v: string) => string | undefined);
    const prompt = makePrompt({
      text: jest.fn().mockImplementation(async (opts: { validate?: (v: string) => string | undefined }) => {
        if (!validate) validate = opts.validate;
        return 'ok-name';
      }),
      select: jest.fn().mockResolvedValueOnce('standard'),
      multiselect: jest.fn().mockResolvedValue([]),
      confirm: jest.fn().mockResolvedValueOnce(false),
    });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['install']);
    expect(validate!('')).toMatch(/required/);
    expect(validate!('has space')).toMatch(/spaces/);
    expect(validate!('UPPER')).toMatch(/lowercase/);
    expect(validate!('ok')).toBeUndefined();
  });
});

describe('AgentsCommand — list', () => {
  it('warns when no agents are installed', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['list']);
    expect(prompt.showWarning).toHaveBeenCalledWith('No agents installed.');
  });

  it('prints each installed agent', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['list']);
    const messages = (prompt.showInfo as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(messages.some(m => m.includes('a1'))).toBe(true);
  });
});

describe('AgentsCommand — validate', () => {
  it('skips validation when no agents are installed', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['validate']);
    expect(prompt.showWarning).toHaveBeenCalledWith('No agents installed to validate.');
  });

  it('reports missing ruleset file', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    mockFsExists.mockResolvedValue(false);
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['validate']);
    expect(prompt.showError).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('passes validation when ruleset is well formed', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      agent: { name: 'a1', version: '1.0.0' },
      ruleset: { version: '1.0' },
      principles: [{ id: 'P1', principle: 'p', severity: 'MUST' }],
    });
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['validate']);
    expect(mockUpdateLastValidated).toHaveBeenCalled();
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('passed'));
  });

  it('reports each issue when ruleset is malformed', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      principles: [{ principle: 'orphan' }],
    });
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['validate']);
    const errors = (prompt.showError as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(errors.some(e => e.includes('agent.name'))).toBe(true);
    expect(errors.some(e => e.includes('ruleset.version'))).toBe(true);
    expect(errors.some(e => e.includes('missing-id'))).toBe(true);
    expect(errors.some(e => e.includes('missing-severity'))).toBe(true);
  });
});

describe('AgentsCommand — remove', () => {
  it('warns when no agents are installed', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['remove']);
    expect(prompt.showWarning).toHaveBeenCalledWith('No agents installed to remove.');
  });

  it('cancels removal when confirm is false', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    const prompt = makePrompt({
      select: jest.fn().mockResolvedValueOnce('a1'),
      confirm: jest.fn().mockResolvedValueOnce(false),
    });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['remove']);
    expect(mockUnregister).not.toHaveBeenCalled();
    expect(prompt.showOutro).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
  });

  it('unregisters when confirm is true', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    const prompt = makePrompt({
      select: jest.fn().mockResolvedValueOnce('a1'),
      confirm: jest.fn().mockResolvedValueOnce(true),
    });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['remove']);
    expect(mockUnregister).toHaveBeenCalled();
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('a1'));
  });
});

describe('AgentsCommand — upgrade', () => {
  it('warns when no agents are installed', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['upgrade']);
    expect(prompt.showWarning).toHaveBeenCalledWith('No agents installed to upgrade.');
  });

  it('bumps the patch version when ruleset is present', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.2.3', template: 'standard' }]);
    mockGetAgent.mockResolvedValue({ name: 'a1', version: '1.2.3', template: 'standard' });
    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({ agent: { name: 'a1', version: '1.2.3' }, ruleset: { version: '1.0' }, principles: [] });
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['upgrade']);
    expect(mockUpdateAgent).toHaveBeenCalledWith(
      expect.any(String), 'a1',
      expect.objectContaining({ version: '1.2.4' }),
      expect.objectContaining({ agent: expect.objectContaining({ version: '1.2.4' }) }),
    );
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('1.2.4'));
  });

  it('returns silently when getAgent yields nothing', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    mockGetAgent.mockResolvedValue(undefined);
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['upgrade']);
    expect(mockUpdateAgent).not.toHaveBeenCalled();
  });

  it('reports missing ruleset file', async () => {
    mockDiscover.mockResolvedValue([{ name: 'a1', version: '1.0.0', template: 'standard' }]);
    mockGetAgent.mockResolvedValue({ name: 'a1', version: '1.0.0', template: 'standard' });
    mockFsExists.mockResolvedValue(false);
    const prompt = makePrompt({ select: jest.fn().mockResolvedValueOnce('a1') });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['upgrade']);
    expect(prompt.showError).toHaveBeenCalledWith('Agent ruleset not found');
  });
});

describe('AgentsCommand — option parsers', () => {
  it('returns inputs verbatim', () => {
    mockDiscover.mockResolvedValue([]);
    const cmd = new AgentsCommand(makePrompt());
    expect(cmd.parseInstall('x')).toBe('x');
    expect(cmd.parseRemove('x')).toBe('x');
    expect(cmd.parseList()).toBe(true);
  });
});
