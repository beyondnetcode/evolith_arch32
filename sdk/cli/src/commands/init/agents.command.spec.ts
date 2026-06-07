import { AgentsCommand } from '../../commands/init/agents.command';
import * as toolUtils from '../../core/mcp/tools/tool-utils';

jest.mock('@clack/prompts', () => ({
  text: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  multiselect: jest.fn(),
  group: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  intro: jest.fn(),
  outro: jest.fn(),
  note: jest.fn(),
  isCancel: jest.fn(),
  cancel: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  chalkFn.bgCyan = { white: { bold: (str: string) => str } };
  chalkFn.bgGreen = { white: { bold: (str: string) => str } };
  chalkFn.bgBlue = { white: { bold: (str: string) => str } };
  chalkFn.bgYellow = { white: { bold: (str: string) => str } };
  chalkFn.bgRed = { white: { bold: (str: string) => str } };
  chalkFn.bgMagenta = { white: { bold: (str: string) => str } };
  chalkFn.gray = (str: string) => str;
  return chalkFn;
});

const mockFileSystem = {
  exists: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  readdirNames: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  remove: jest.fn(),
  stat: jest.fn(),
};

jest.mock('../../core/mcp/tools/tool-utils', () => ({
  getFileSystem: jest.fn(),
  getContainer: jest.fn(),
}));

import * as p from '@clack/prompts';

describe('AgentsCommand', () => {
  let command: AgentsCommand;
  let exitSpy: jest.SpyInstance;
  let consoleClearSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (toolUtils.getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    command = new AgentsCommand();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleClearSpy.mockRestore();
  });

  describe('run', () => {
    it('should show menu when no action is provided', async () => {
      (p.select as jest.Mock).mockResolvedValue('exit');

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalled();
    });

    it('should call installAgent when action is "install"', async () => {
      (p.group as jest.Mock).mockResolvedValue({
        name: 'test-agent',
        template: 'standard',
        description: 'Test agent',
        adrs: ['adr-0002'],
        rulesets: ['acl'],
        confirmInstall: true,
      });

      await command.run(['install'], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.group).toHaveBeenCalled();
    });

    it('should call listAgents when action is "list"', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await command.run(['list'], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should call validateAgent when action is "validate"', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await command.run(['validate'], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.log.error).toHaveBeenCalled();
    });

    it('should call upgradeAgent when action is "upgrade"', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await command.run(['upgrade'], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.log.error).toHaveBeenCalled();
    });

    it('should call removeAgent when action is "remove"', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await command.run(['remove'], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.log.error).toHaveBeenCalled();
    });

    it('should default to menu when action is unknown', async () => {
      (p.select as jest.Mock).mockResolvedValue('exit');

      await command.run(['unknown-action'], {});

      expect(p.select).toHaveBeenCalled();
    });
  });

  describe('showMenu', () => {
    it('should exit when user selects exit', async () => {
      (p.select as jest.Mock).mockResolvedValue('exit');

      await (command as any).showMenu();

      expect(p.outro).toHaveBeenCalled();
    });

    it('should call installAgent when user selects install', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('install');
      (p.group as jest.Mock).mockResolvedValue({
        name: 'menu-agent',
        template: 'standard',
        description: '',
        adrs: [],
        rulesets: [],
        confirmInstall: true,
      });

      await (command as any).showMenu();

      expect(p.group).toHaveBeenCalled();
    });

    it('should call listAgents when user selects list', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('list');
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).showMenu();

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should call validateAgent when user selects validate', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('validate');
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).showMenu();

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should call upgradeAgent when user selects upgrade', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('upgrade');
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).showMenu();

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should call removeAgent when user selects remove', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('remove');
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).showMenu();

      expect(p.log.error).toHaveBeenCalled();
    });
  });

  describe('installAgent', () => {
    it('should install agent successfully when confirmed', async () => {
      (p.group as jest.Mock).mockResolvedValue({
        name: 'test-agent',
        template: 'standard',
        description: 'Test agent',
        adrs: ['adr-0002', 'adr-0018'],
        rulesets: ['acl'],
        confirmInstall: true,
      });
      (mockFileSystem.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (mockFileSystem.writeJson as jest.Mock).mockResolvedValue(undefined);

      await (command as any).installAgent({});

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJson).toHaveBeenCalledTimes(2);
      expect(p.log.success).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should cancel installation when user declines confirmation', async () => {
      (p.group as jest.Mock).mockResolvedValue({
        name: 'test-agent',
        template: 'minimal',
        description: '',
        adrs: [],
        rulesets: [],
        confirmInstall: false,
      });

      await (command as any).installAgent({});

      expect(mockFileSystem.ensureDir).not.toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should install enterprise agent with audit principles', async () => {
      (p.group as jest.Mock).mockResolvedValue({
        name: 'enterprise-agent',
        template: 'enterprise',
        description: '',
        adrs: [],
        rulesets: [],
        confirmInstall: true,
      });
      (mockFileSystem.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (mockFileSystem.writeJson as jest.Mock).mockResolvedValue(undefined);

      await (command as any).installAgent({});

      const rulesetCall = (mockFileSystem.writeJson as jest.Mock).mock.calls[0];
      expect(rulesetCall[1].principles.length).toBeGreaterThan(1);
    });

    it('should handle installation with all ADRs and rulesets', async () => {
      (p.group as jest.Mock).mockResolvedValue({
        name: 'full-agent',
        template: 'enterprise',
        description: 'Full agent',
        adrs: ['adr-0002', 'adr-0018', 'adr-0032'],
        rulesets: ['acl', 'open-core', 'inheritance'],
        confirmInstall: true,
      });
      (mockFileSystem.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (mockFileSystem.writeJson as jest.Mock).mockResolvedValue(undefined);

      await (command as any).installAgent({});

      expect(mockFileSystem.writeJson).toHaveBeenCalledTimes(2);
    });
  });

  describe('listAgents', () => {
    it('should show warning when agents directory does not exist', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).listAgents({});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should show warning when no agents are installed', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue([]);

      await (command as any).listAgents({});

      expect(p.log.warn).toHaveBeenCalledWith('No agents installed.');
    });

    it('should list installed agents', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['agent-one', 'agent-two']);
      (mockFileSystem.readJson as jest.Mock).mockResolvedValue({
        name: 'agent-one',
        version: '1.0.0',
        template: 'standard',
      });

      await (command as any).listAgents({});

      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining('2 installed agent'));
      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining('agent-one'));
    });

    it('should handle agents without config files', async () => {
      (mockFileSystem.exists as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['orphan-agent']);

      await (command as any).listAgents({});

      expect(p.log.info).toHaveBeenCalled();
    });
  });

  describe('validateAgent', () => {
    it('should show error when agents directory does not exist', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).validateAgent({});

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show warning when no agents to validate', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue([]);

      await (command as any).validateAgent({});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should validate agent successfully', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['valid-agent']);
      (p.select as jest.Mock).mockResolvedValue('valid-agent');
      (mockFileSystem.readJson as jest.Mock).mockResolvedValue({
        agent: { name: 'valid-agent' },
        ruleset: { version: '1.0' },
        principles: [
          { id: 'AGT-01', principle: 'Test', severity: 'MUST', blocking: true },
        ],
      });

      await (command as any).validateAgent({});

      expect(p.log.success).toHaveBeenCalled();
    });

    it('should report validation errors for invalid ruleset', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['invalid-agent']);
      (p.select as jest.Mock).mockResolvedValue('invalid-agent');
      (mockFileSystem.readJson as jest.Mock).mockResolvedValue({
        agent: {},
        ruleset: {},
        principles: [],
      });

      await (command as any).validateAgent({});

      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('3 issue(s)'));
    });

    it('should report missing principle id and severity', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['bad-principles']);
      (p.select as jest.Mock).mockResolvedValue('bad-principles');
      (mockFileSystem.readJson as jest.Mock).mockResolvedValue({
        agent: { name: 'bad-principles' },
        ruleset: { version: '1.0' },
        principles: [
          { principle: 'No ID', severity: 'MUST', blocking: true },
          { id: 'AGT-02', principle: 'No Severity', blocking: false },
        ],
      });

      await (command as any).validateAgent({});

      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('2 issue(s)'));
    });

    it('should show error when ruleset file does not exist', async () => {
      (mockFileSystem.exists as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['missing-ruleset']);
      (p.select as jest.Mock).mockResolvedValue('missing-ruleset');

      await (command as any).validateAgent({});

      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('removeAgent', () => {
    it('should show error when agents directory does not exist', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).removeAgent({});

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show warning when no agents to remove', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue([]);

      await (command as any).removeAgent({});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should remove agent when confirmed', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['old-agent']);
      (p.select as jest.Mock).mockResolvedValue('old-agent');
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.remove as jest.Mock).mockResolvedValue(undefined);

      await (command as any).removeAgent({});

      expect(mockFileSystem.remove).toHaveBeenCalled();
      expect(p.log.success).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should cancel removal when user declines', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['keep-agent']);
      (p.select as jest.Mock).mockResolvedValue('keep-agent');
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await (command as any).removeAgent({});

      expect(mockFileSystem.remove).not.toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });
  });

  describe('upgradeAgent', () => {
    it('should show error when agents directory does not exist', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(false);

      await (command as any).upgradeAgent({});

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show warning when no agents to upgrade', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue([]);

      await (command as any).upgradeAgent({});

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should upgrade agent version', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['upgrade-me']);
      (p.select as jest.Mock).mockResolvedValue('upgrade-me');
      (mockFileSystem.readJson as jest.Mock)
        .mockResolvedValueOnce({
          agent: { version: '1.0.0' },
        })
        .mockResolvedValueOnce({
          name: 'upgrade-me',
          version: '1.0.0',
        });
      (mockFileSystem.writeJson as jest.Mock).mockResolvedValue(undefined);

      await (command as any).upgradeAgent({});

      expect(mockFileSystem.writeJson).toHaveBeenCalledTimes(2);
      expect(p.log.success).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalled();
    });

    it('should handle missing ruleset file', async () => {
      (mockFileSystem.exists as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['no-ruleset']);
      (p.select as jest.Mock).mockResolvedValue('no-ruleset');

      await (command as any).upgradeAgent({});

      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    it('should default to version 1.0.0 when agent version is missing', async () => {
      (mockFileSystem.exists as jest.Mock).mockResolvedValue(true);
      (mockFileSystem.readdirNames as jest.Mock).mockResolvedValue(['no-version']);
      (p.select as jest.Mock).mockResolvedValue('no-version');
      (mockFileSystem.readJson as jest.Mock)
        .mockResolvedValueOnce({
          agent: {},
        })
        .mockResolvedValueOnce({
          name: 'no-version',
        });
      (mockFileSystem.writeJson as jest.Mock).mockResolvedValue(undefined);

      await (command as any).upgradeAgent({});

      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining('1.0.0 → 1.0.1'));
    });
  });

  describe('buildAgentRuleset', () => {
    it('should build ruleset with agent identity principle', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'test-agent',
        template: 'standard',
        adrs: [],
        rulesets: [],
      });

      expect(ruleset.agent.name).toBe('test-agent');
      expect(ruleset.principles).toHaveLength(1);
      expect(ruleset.principles[0].id).toBe('AGT-01');
      expect(ruleset.principles[0].severity).toBe('MUST');
    });

    it('should add enterprise principles for enterprise template', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'enterprise-agent',
        template: 'enterprise',
        adrs: [],
        rulesets: [],
      });

      const principleIds = ruleset.principles.map((p: { id: string }) => p.id);
      expect(principleIds).toContain('AGT-01');
      expect(principleIds).toContain('AGT-02');
      expect(principleIds).toContain('AGT-03');
    });

    it('should add hexagonal architecture principle when adr-0002 selected', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'hex-agent',
        template: 'standard',
        adrs: ['adr-0002'],
        rulesets: [],
      });

      const principleIds = ruleset.principles.map((p: { id: string }) => p.id);
      expect(principleIds).toContain('AGT-HXA-01');
    });

    it('should add testing pyramid principle when adr-0018 selected', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'test-pyramid-agent',
        template: 'standard',
        adrs: ['adr-0018'],
        rulesets: [],
      });

      const principleIds = ruleset.principles.map((p: { id: string }) => p.id);
      expect(principleIds).toContain('AGT-TP-01');
    });

    it('should add ACL principle when acl ruleset selected', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'acl-agent',
        template: 'standard',
        adrs: [],
        rulesets: ['acl'],
      });

      const principleIds = ruleset.principles.map((p: { id: string }) => p.id);
      expect(principleIds).toContain('AGT-ACL-01');
    });

    it('should include metadata with adrs and rulesets', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'metadata-agent',
        template: 'minimal',
        adrs: ['adr-0002', 'adr-0018'],
        rulesets: ['acl', 'open-core'],
      });

      expect(ruleset.metadata.adrs).toEqual(['adr-0002', 'adr-0018']);
      expect(ruleset.metadata.rulesets).toEqual(['acl', 'open-core']);
    });

    it('should have correct ruleset structure', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'structure-agent',
        template: 'standard',
        adrs: [],
        rulesets: [],
      });

      expect(ruleset).toHaveProperty('agent');
      expect(ruleset).toHaveProperty('ruleset');
      expect(ruleset).toHaveProperty('principles');
      expect(ruleset).toHaveProperty('metadata');
      expect(ruleset.ruleset.type).toBe('agent');
      expect(ruleset.ruleset.scope).toBe('governance');
    });

    it('should combine multiple ADRs and rulesets', () => {
      const ruleset = (command as any).buildAgentRuleset({
        name: 'combined-agent',
        template: 'enterprise',
        adrs: ['adr-0002', 'adr-0018'],
        rulesets: ['acl', 'open-core'],
      });

      expect(ruleset.principles.length).toBeGreaterThan(4);
    });
  });

  describe('option parsers', () => {
    it('should parse install option', () => {
      expect(command.parseInstall('my-agent')).toBe('my-agent');
    });

    it('should parse remove option', () => {
      expect(command.parseRemove('old-agent')).toBe('old-agent');
    });

    it('should parse list option', () => {
      expect(command.parseList()).toBe(true);
    });

    it('should parse dry-run option', () => {
      expect(command.parseDryRun()).toBe(true);
    });
  });
});
