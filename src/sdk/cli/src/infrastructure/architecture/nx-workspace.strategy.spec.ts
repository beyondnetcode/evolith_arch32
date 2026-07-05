import { NxWorkspaceStrategy } from './nx-workspace.strategy';
import { ICommandExecutor } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { PromptService } from '../prompts/prompt.service';

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockCommandExecutor = {
  execute: jest.fn(),
  executeOrThrow: jest.fn().mockResolvedValue(''),
  checkTool: jest.fn(),
};

const mockPromptService = {
  showInfo: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showSuccess: jest.fn(),
  showIntro: jest.fn(),
  showOutro: jest.fn(),
  startSpinner: jest.fn(),
  stopSpinner: jest.fn(),
  updateSpinnerMessage: jest.fn(),
  select: jest.fn(),
  multiselect: jest.fn(),
  text: jest.fn(),
  confirm: jest.fn(),
};

jest.mock('process', () => ({ cwd: jest.fn().mockReturnValue('/workspace') }));

// ── helpers ───────────────────────────────────────────────────────────────────

/** Collect all `npx nx` commands that were executed. */
function nxCalls(): string[] {
  return mockCommandExecutor.executeOrThrow.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter(cmd => cmd.includes('npx nx'));
}

/** Collect all `npm` commands. */
function npmCalls(): string[] {
  return mockCommandExecutor.executeOrThrow.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter(cmd => cmd.startsWith('npm '));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NxWorkspaceStrategy', () => {

  // ── installDependencies ────────────────────────────────────────────────────

  describe('installDependencies', () => {
    it('installs @nx/react plugin for react framework', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('react', 'prisma');
      expect(npmCalls()[0]).toContain('@nx/react');
    });

    it('installs @nx/angular plugin for angular framework', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('angular', 'typeorm');
      expect(npmCalls()[0]).toContain('@nx/angular');
    });

    it('installs @nx/vue plugin for vue framework', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('vue', 'prisma');
      expect(npmCalls()[0]).toContain('@nx/vue');
    });

    it('installs prisma when orm is prisma', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('react', 'prisma');
      const all = npmCalls().join(' ');
      expect(all).toContain('prisma');
    });

    it('installs typeorm when orm is typeorm', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('react', 'typeorm');
      const all = npmCalls().join(' ');
      expect(all).toContain('typeorm');
    });

    it('does not install prisma or typeorm for unknown orm', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('react', 'mongoose');
      // Only the one install-plugins call, no second call
      expect(npmCalls()).toHaveLength(1);
    });

    it('always installs @nx/nest and @nx/webpack alongside the framework', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).installDependencies('vue', 'none');
      const cmd = npmCalls()[0];
      expect(cmd).toContain('@nx/nest');
      expect(cmd).toContain('@nx/webpack');
    });
  });

  // ── generateStandardWebApp ─────────────────────────────────────────────────

  describe('generateStandardWebApp', () => {
    it('uses @nx/react:app for react', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateStandardWebApp('my-app', 'react');
      expect(nxCalls()[0]).toContain('@nx/react:app');
      expect(nxCalls()[0]).toContain('--name=my-app');
    });

    it('uses @nx/angular:app for angular', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateStandardWebApp('ng-app', 'angular');
      expect(nxCalls()[0]).toContain('@nx/angular:app');
    });

    it('uses @nx/vue:app for vue', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateStandardWebApp('vue-app', 'vue');
      expect(nxCalls()[0]).toContain('@nx/vue:app');
    });

    it('places app in apps/<name> directory', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateStandardWebApp('tracker-web', 'react');
      expect(nxCalls()[0]).toContain('--directory=apps/tracker-web');
    });
  });

  // ── generateHostApp ────────────────────────────────────────────────────────

  describe('generateHostApp', () => {
    it('uses @nx/react:host with remotes for react', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('host', ['remote1', 'remote2'], 'react');
      const cmd = nxCalls()[0];
      expect(cmd).toContain('@nx/react:host');
      expect(cmd).toContain('--remotes=remote1,remote2');
    });

    it('uses @nx/angular:host for angular', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('ng-host', ['ng-r1'], 'angular');
      expect(nxCalls()[0]).toContain('@nx/angular:host');
    });

    it('generates standard app instead of :host for vue (no native MFE support)', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('vue-host', ['remote1'], 'vue');
      const cmd = nxCalls()[0];
      // Falls back to :app, NOT :host
      expect(cmd).toContain('@nx/vue:app');
      expect(cmd).not.toContain(':host');
    });

    it('prints warning when vue MFE fallback is triggered', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('vue-host', [], 'vue');
      const output = mockPromptService.showInfo.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('does not provide a native Module Federation');
    });

    it('omits --remotes flag when remotes array is empty', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('host', [], 'react');
      expect(nxCalls()[0]).not.toContain('--remotes');
    });

    it('places host in apps/<name> directory', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateHostApp('tracker-host', ['r1'], 'react');
      expect(nxCalls()[0]).toContain('--directory=apps/tracker-host');
    });
  });

  // ── generateApiApp ─────────────────────────────────────────────────────────

  describe('generateApiApp', () => {
    it('always uses @nx/nest:app regardless of frontend framework', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateApiApp('tracker-api');
      expect(nxCalls()[0]).toContain('@nx/nest:app');
      expect(nxCalls()[0]).toContain('--name=tracker-api');
    });
  });

  // ── generateLibrary ────────────────────────────────────────────────────────

  describe('generateLibrary', () => {
    it('uses @nx/nest:library for domain libs', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateLibrary('billing', 'domain');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses @nx/nest:library for shell libs', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateLibrary('workflow-engine', 'shell');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses @nx/nest:library for shared non-UI libs', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateLibrary('db-schema', 'shared');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses frontend framework generator for shared UI libs (react)', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.installDependencies('react', 'prisma');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('design-system-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/react:library');
    });

    it('uses frontend framework generator for shared UI libs (angular)', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.installDependencies('angular', 'typeorm');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('components-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/angular:library');
    });

    it('uses @nx/vue:library for shared UI libs when vue is the active framework', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.installDependencies('vue', 'prisma');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('widgets-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/vue:library');
    });

    it('does NOT use the frontend framework for non-UI shared libs', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.installDependencies('react', 'prisma');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('db-schema', 'shared'); // no "ui" in name
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('places library in libs/<type>/<name> directory', async () => {
      await new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService).generateLibrary('billing', 'domain');
      expect(nxCalls()[0]).toContain('--directory=libs/domain/billing');
    });
  });

  // ── framework state propagation ────────────────────────────────────────────

  describe('framework state propagation', () => {
    it('tracks framework set via installDependencies for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.installDependencies('vue', 'none');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('nav-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/vue:library');
    });

    it('tracks framework set via generateStandardWebApp for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.generateStandardWebApp('app', 'angular');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('header-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/angular:library');
    });

    it('tracks framework set via generateHostApp for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy(mockCommandExecutor as unknown as ICommandExecutor, mockPromptService as unknown as PromptService);
      await strategy.generateHostApp('host', [], 'react');
      mockCommandExecutor.executeOrThrow.mockClear();
      await strategy.generateLibrary('sidebar-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/react:library');
    });
  });
});
