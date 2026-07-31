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
const mockPlanInstall = jest.fn().mockReturnValue(['rulesets/agents/my-agent/agent.config.json']);
jest.mock('../../infrastructure/adapters/agent-registry.service', () => ({
  AgentRegistryService: jest.fn().mockImplementation(() => ({
    installAgent: mockInstall,
    planInstall: mockPlanInstall,
    discover: mockDiscover,
    unregister: mockUnregister,
    getAgent: mockGetAgent,
    updateAgent: mockUpdateAgent,
    updateLastValidated: mockUpdateLastValidated,
  })),
}));

const mockFsExists = jest.fn();
const mockFsReadJson = jest.fn();
jest.mock('@beyondnet/evolith-infra-providers', () => ({
  NodeFileSystemProvider: jest.fn().mockImplementation(() => ({
    createFileSystem: () => ({ exists: mockFsExists, readJson: mockFsReadJson }),
  })),
}));

// Keep the `--run` routing path offline: stub the runtime client so exercising
// the flag never opens a socket.
const mockAgentHandle = jest.fn().mockResolvedValue({ ok: true });
jest.mock('@beyondnet/evolith-sdk', () => ({
  EvolithRestClient: jest.fn().mockImplementation(() => ({
    agent: { handle: mockAgentHandle },
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

// GT-458: `agents --list/--install/--remove/--run` advertised in --help must
// route to their action non-interactively. Before the fix the action derived
// only from passedParam[0], so every flag fell through to the interactive menu
// (dead flags that broke CI). The interactive menu is `showIntro('...Agent
// Management')` + a `select`; asserting neither fires proves flags are honored.
describe('AgentsCommand — GT-458 flag routing', () => {
  const MENU_INTRO = 'Evolith SDK - Agent Management';

  it('routes --list to the list action without the interactive menu', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([], { list: true });
    expect(mockDiscover).toHaveBeenCalled();
    expect(prompt.showIntro).not.toHaveBeenCalledWith(MENU_INTRO);
    expect(prompt.select).not.toHaveBeenCalled();
  });

  it('routes --install to the install action without the interactive menu', async () => {
    const prompt = makePrompt({ confirm: jest.fn().mockResolvedValue(false) });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([], { install: 'my-agent' });
    expect(prompt.text).toHaveBeenCalled();
    expect(prompt.showIntro).not.toHaveBeenCalledWith(MENU_INTRO);
    expect(mockInstall).not.toHaveBeenCalled(); // confirm=false → cancelled, still non-interactive
  });

  it('routes --remove to the remove action without the interactive menu', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([], { remove: 'a1' });
    expect(mockDiscover).toHaveBeenCalled();
    expect(prompt.showIntro).not.toHaveBeenCalledWith(MENU_INTRO);
  });

  it('routes --run to the runtime action using the supplied intent', async () => {
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand([], { run: 'generate plan' });
    expect(mockAgentHandle).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'generate plan' }),
    );
    expect(prompt.showIntro).not.toHaveBeenCalledWith(MENU_INTRO);
    expect(prompt.select).not.toHaveBeenCalled();
  });

  it('lets a positional action win over a conflicting flag', async () => {
    mockDiscover.mockResolvedValue([]);
    const prompt = makePrompt();
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['list'], { install: 'x' });
    expect(mockDiscover).toHaveBeenCalled(); // list ran
    expect(prompt.text).not.toHaveBeenCalled(); // install did not
  });
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

  // GT-643 — the flag was declared and never read, so install wrote anyway.
  // The assertion is that the WRITER is not reached: checking the message alone
  // would pass again the day someone reports a dry run while still writing.
  it('does not reach the writer with --dry-run, and says what it would have written', async () => {
    const prompt = makePrompt({
      text: jest.fn().mockResolvedValueOnce('my-agent').mockResolvedValueOnce('desc'),
      select: jest.fn().mockResolvedValueOnce('standard'),
      multiselect: jest.fn().mockResolvedValue([]),
      confirm: jest.fn().mockResolvedValueOnce(true),
    });
    const cmd = new AgentsCommand(prompt);
    await cmd.executeCommand(['install'], { dryRun: true } as never);
    expect(mockInstall).not.toHaveBeenCalled();
    expect(mockPlanInstall).toHaveBeenCalledWith(expect.any(String), 'my-agent');
    expect(prompt.showSuccess).toHaveBeenCalledWith(expect.stringContaining('NOT written'));
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

// El modo `--format json` era el grueso de las ramas sin cubrir de este
// comando: cada accion (list, validate, install, remove, upgrade) tiene su par
// json/humano y solo se ejercitaba el humano. Es el modo por el que un agente
// invoca la CLI, y donde el envelope ADR-0073 es lo unico legible por maquina.
describe('AgentsCommand — --format json', () => {
  let logSpy: jest.SpyInstance;
  const J = { format: 'json' } as never;

  const env = () => {
    const printed = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((s: string) => s.trim().startsWith('{'));
    expect(printed.length).toBeGreaterThan(0);
    return JSON.parse(printed[printed.length - 1]);
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('list emite envelope de exito con los agentes instalados', async () => {
    mockDiscover.mockResolvedValue([
      { name: 'gap-analyzer', version: '1.0.0', template: 'standard' },
    ]);
    await new AgentsCommand(makePrompt()).executeCommand(['list'], J);
    const e = env();
    expect(e.success).toBe(true);
    expect(JSON.stringify(e.data)).toMatch(/gap-analyzer/);
  });

  it('list con cero agentes sigue siendo exito, no error', async () => {
    mockDiscover.mockResolvedValue([]);
    await new AgentsCommand(makePrompt()).executeCommand(['list'], J);
    expect(env().success).toBe(true);
  });

  it('validate sin agentes instalados falla como RULESET_NOT_FOUND al pedir uno por nombre', async () => {
    mockDiscover.mockResolvedValue([]);
    await new AgentsCommand(makePrompt()).executeCommand(
      ['validate'],
      { format: 'json', name: 'gap-analyzer' } as never,
    );
    const e = env();
    expect(e.success).toBe(false);
    expect(e.error.code).toBe('RULESET_NOT_FOUND');
  });

  it('validate exige --name en json en vez de colgarse esperando un prompt', async () => {
    mockDiscover.mockResolvedValue([{ name: 'gap-analyzer', version: '1.0.0' }]);
    await new AgentsCommand(makePrompt()).executeCommand(['validate'], J);
    const e = env();
    expect(e.success).toBe(false);
    expect(e.error.message).toMatch(/--name/);
  });

  it('validate reporta el ruleset ausente nombrando la ruta', async () => {
    mockDiscover.mockResolvedValue([{ name: 'gap-analyzer', version: '1.0.0' }]);
    mockFsExists.mockResolvedValue(false);
    await new AgentsCommand(makePrompt()).executeCommand(
      ['validate'],
      { format: 'json', name: 'gap-analyzer' } as never,
    );
    const e = env();
    expect(e.success).toBe(false);
    expect(e.error.code).toBe('RULESET_NOT_FOUND');
  });

  it('validate devuelve el veredicto NEGATIVO como exito, con sus issues', async () => {
    mockDiscover.mockResolvedValue([{ name: 'gap-analyzer', version: '1.0.0' }]);
    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      agent: { name: 'gap-analyzer' },
      ruleset: { version: '1.0.0' },
      principles: [{ principle: 'sin id ni severity' }],
    });
    await new AgentsCommand(makePrompt()).executeCommand(
      ['validate'],
      { format: 'json', name: 'gap-analyzer' } as never,
    );
    const e = env();
    // ADR-0073: el comando corrio (success) y el veredicto viaja dentro.
    expect(e.success).toBe(true);
    expect(e.data.passed).toBe(false);
    expect(e.data.issuesCount).toBeGreaterThan(0);
  });

  it('validate marca passed cuando el ruleset esta completo', async () => {
    mockDiscover.mockResolvedValue([{ name: 'gap-analyzer', version: '1.0.0' }]);
    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      agent: { name: 'gap-analyzer' },
      ruleset: { version: '1.0.0' },
      principles: [{ id: 'ACL-01', principle: 'ok', severity: 'MUST' }],
    });
    await new AgentsCommand(makePrompt()).executeCommand(
      ['validate'],
      { format: 'json', name: 'gap-analyzer' } as never,
    );
    const e = env();
    expect(e.success).toBe(true);
    expect(e.data.passed).toBe(true);
  });

  it('remove sin agentes instalados no revienta y responde en json', async () => {
    mockDiscover.mockResolvedValue([]);
    await new AgentsCommand(makePrompt()).executeCommand(['remove'], J);
    expect(env()).toHaveProperty('meta');
  });
});
