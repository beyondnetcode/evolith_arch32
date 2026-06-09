import { NxWorkspaceStrategy } from './nx-workspace.strategy';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('process', () => ({ cwd: jest.fn().mockReturnValue('/workspace') }));

import { execSync } from 'child_process';
const mockExec = execSync as jest.Mock;

// ── helpers ───────────────────────────────────────────────────────────────────

/** Collect all `npx nx` commands that were executed. */
function nxCalls(): string[] {
  return mockExec.mock.calls
    .map((c: any[]) => String(c[0]))
    .filter(cmd => cmd.includes('npx nx'));
}

/** Collect all `npm` commands. */
function npmCalls(): string[] {
  return mockExec.mock.calls
    .map((c: any[]) => String(c[0]))
    .filter(cmd => cmd.startsWith('npm '));
}

beforeEach(() => {
  jest.clearAllMocks();
  // Re-silence every test so inner spies that call mockRestore() don't bleed output.
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NxWorkspaceStrategy', () => {

  // ── installDependencies ────────────────────────────────────────────────────

  describe('installDependencies', () => {
    it('installs @nx/react plugin for react framework', async () => {
      await new NxWorkspaceStrategy().installDependencies('react', 'prisma');
      expect(npmCalls()[0]).toContain('@nx/react');
    });

    it('installs @nx/angular plugin for angular framework', async () => {
      await new NxWorkspaceStrategy().installDependencies('angular', 'typeorm');
      expect(npmCalls()[0]).toContain('@nx/angular');
    });

    it('installs @nx/vue plugin for vue framework', async () => {
      await new NxWorkspaceStrategy().installDependencies('vue', 'prisma');
      expect(npmCalls()[0]).toContain('@nx/vue');
    });

    it('installs prisma when orm is prisma', async () => {
      await new NxWorkspaceStrategy().installDependencies('react', 'prisma');
      const all = npmCalls().join(' ');
      expect(all).toContain('prisma');
    });

    it('installs typeorm when orm is typeorm', async () => {
      await new NxWorkspaceStrategy().installDependencies('react', 'typeorm');
      const all = npmCalls().join(' ');
      expect(all).toContain('typeorm');
    });

    it('does not install prisma or typeorm for unknown orm', async () => {
      await new NxWorkspaceStrategy().installDependencies('react', 'mongoose');
      // Only the one install-plugins call, no second call
      expect(npmCalls()).toHaveLength(1);
    });

    it('always installs @nx/nest and @nx/webpack alongside the framework', async () => {
      await new NxWorkspaceStrategy().installDependencies('vue', 'none');
      const cmd = npmCalls()[0];
      expect(cmd).toContain('@nx/nest');
      expect(cmd).toContain('@nx/webpack');
    });
  });

  // ── generateStandardWebApp ─────────────────────────────────────────────────

  describe('generateStandardWebApp', () => {
    it('uses @nx/react:app for react', async () => {
      await new NxWorkspaceStrategy().generateStandardWebApp('my-app', 'react');
      expect(nxCalls()[0]).toContain('@nx/react:app');
      expect(nxCalls()[0]).toContain('--name=my-app');
    });

    it('uses @nx/angular:app for angular', async () => {
      await new NxWorkspaceStrategy().generateStandardWebApp('ng-app', 'angular');
      expect(nxCalls()[0]).toContain('@nx/angular:app');
    });

    it('uses @nx/vue:app for vue', async () => {
      await new NxWorkspaceStrategy().generateStandardWebApp('vue-app', 'vue');
      expect(nxCalls()[0]).toContain('@nx/vue:app');
    });

    it('places app in apps/<name> directory', async () => {
      await new NxWorkspaceStrategy().generateStandardWebApp('tracker-web', 'react');
      expect(nxCalls()[0]).toContain('--directory=apps/tracker-web');
    });
  });

  // ── generateHostApp ────────────────────────────────────────────────────────

  describe('generateHostApp', () => {
    it('uses @nx/react:host with remotes for react', async () => {
      await new NxWorkspaceStrategy().generateHostApp('host', ['remote1', 'remote2'], 'react');
      const cmd = nxCalls()[0];
      expect(cmd).toContain('@nx/react:host');
      expect(cmd).toContain('--remotes=remote1,remote2');
    });

    it('uses @nx/angular:host for angular', async () => {
      await new NxWorkspaceStrategy().generateHostApp('ng-host', ['ng-r1'], 'angular');
      expect(nxCalls()[0]).toContain('@nx/angular:host');
    });

    it('generates standard app instead of :host for vue (no native MFE support)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await new NxWorkspaceStrategy().generateHostApp('vue-host', ['remote1'], 'vue');
      const cmd = nxCalls()[0];
      // Falls back to :app, NOT :host
      expect(cmd).toContain('@nx/vue:app');
      expect(cmd).not.toContain(':host');
      consoleSpy.mockRestore();
    });

    it('prints warning when vue MFE fallback is triggered', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await new NxWorkspaceStrategy().generateHostApp('vue-host', [], 'vue');
      const output = consoleSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('does not provide a native Module Federation');
      consoleSpy.mockRestore();
    });

    it('omits --remotes flag when remotes array is empty', async () => {
      await new NxWorkspaceStrategy().generateHostApp('host', [], 'react');
      expect(nxCalls()[0]).not.toContain('--remotes');
    });

    it('places host in apps/<name> directory', async () => {
      await new NxWorkspaceStrategy().generateHostApp('tracker-host', ['r1'], 'react');
      expect(nxCalls()[0]).toContain('--directory=apps/tracker-host');
    });
  });

  // ── generateApiApp ─────────────────────────────────────────────────────────

  describe('generateApiApp', () => {
    it('always uses @nx/nest:app regardless of frontend framework', async () => {
      await new NxWorkspaceStrategy().generateApiApp('tracker-api');
      expect(nxCalls()[0]).toContain('@nx/nest:app');
      expect(nxCalls()[0]).toContain('--name=tracker-api');
    });
  });

  // ── generateLibrary ────────────────────────────────────────────────────────

  describe('generateLibrary', () => {
    it('uses @nx/nest:library for domain libs', async () => {
      await new NxWorkspaceStrategy().generateLibrary('billing', 'domain');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses @nx/nest:library for shell libs', async () => {
      await new NxWorkspaceStrategy().generateLibrary('workflow-engine', 'shell');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses @nx/nest:library for shared non-UI libs', async () => {
      await new NxWorkspaceStrategy().generateLibrary('db-schema', 'shared');
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('uses frontend framework generator for shared UI libs (react)', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.installDependencies('react', 'prisma');
      mockExec.mockClear();
      await strategy.generateLibrary('design-system-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/react:library');
    });

    it('uses frontend framework generator for shared UI libs (angular)', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.installDependencies('angular', 'typeorm');
      mockExec.mockClear();
      await strategy.generateLibrary('components-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/angular:library');
    });

    it('uses @nx/vue:library for shared UI libs when vue is the active framework', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.installDependencies('vue', 'prisma');
      mockExec.mockClear();
      await strategy.generateLibrary('widgets-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/vue:library');
    });

    it('does NOT use the frontend framework for non-UI shared libs', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.installDependencies('react', 'prisma');
      mockExec.mockClear();
      await strategy.generateLibrary('db-schema', 'shared'); // no "ui" in name
      expect(nxCalls()[0]).toContain('@nx/nest:library');
    });

    it('places library in libs/<type>/<name> directory', async () => {
      await new NxWorkspaceStrategy().generateLibrary('billing', 'domain');
      expect(nxCalls()[0]).toContain('--directory=libs/domain/billing');
    });
  });

  // ── framework state propagation ────────────────────────────────────────────

  describe('framework state propagation', () => {
    it('tracks framework set via installDependencies for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.installDependencies('vue', 'none');
      mockExec.mockClear();
      await strategy.generateLibrary('nav-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/vue:library');
    });

    it('tracks framework set via generateStandardWebApp for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.generateStandardWebApp('app', 'angular');
      mockExec.mockClear();
      await strategy.generateLibrary('header-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/angular:library');
    });

    it('tracks framework set via generateHostApp for later library calls', async () => {
      const strategy = new NxWorkspaceStrategy();
      await strategy.generateHostApp('host', [], 'react');
      mockExec.mockClear();
      await strategy.generateLibrary('sidebar-ui', 'shared');
      expect(nxCalls()[0]).toContain('@nx/react:library');
    });
  });
});
