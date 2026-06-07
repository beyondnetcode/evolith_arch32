import { AgentsCommand } from '../../commands/init/agents.command';
import * as toolUtils from '../../core/mcp/tools/tool-utils';

jest.mock('@clack/prompts', () => ({
  text: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  intro: jest.fn(),
  outro: jest.fn(),
  isCancel: jest.fn(),
  cancel: jest.fn(),
}));

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

describe('AgentsCommand', () => {
  let command: AgentsCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    (toolUtils.getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    command = new AgentsCommand();
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
  });
});
