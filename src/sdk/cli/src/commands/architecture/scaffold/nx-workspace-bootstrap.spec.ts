/**
 * GT-626 — the bootstrap's own contract: what it writes, and the one case where
 * it declines so the caller can keep refusing fast.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  bootstrapNxWorkspace,
  canBootstrapNxWorkspace,
  isNxWorkspace,
  nxWorkspaceDir,
  nxWorkspaceFiles,
  nxWorkspaceName,
} from './nx-workspace-bootstrap';

describe('GT-626 · Nx workspace bootstrap', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt626-bootstrap-')));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates the workspace `nx` needs, in <baseDir>/src', () => {
    const result = bootstrapNxWorkspace(tmp);

    expect(result.action).toBe('created');
    expect(result.workspaceDir).toBe(nxWorkspaceDir(tmp));
    expect(result.files.sort()).toEqual(['.gitignore', 'nx.json', 'package.json', 'tsconfig.base.json']);
    expect(isNxWorkspace(tmp)).toBe(true);
  });

  it('writes a package.json npm accepts and an nx.json Nx can read', () => {
    bootstrapNxWorkspace(tmp);
    const dir = nxWorkspaceDir(tmp);

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    expect(manifest.name).toMatch(/^[a-z0-9][a-z0-9._-]*$/);
    expect(manifest.private).toBe(true);

    const nxJson = JSON.parse(fs.readFileSync(path.join(dir, 'nx.json'), 'utf8'));
    expect(nxJson.workspaceLayout).toEqual({ appsDir: 'apps', libsDir: 'libs' });
    expect(nxJson.targetDefaults.build.dependsOn).toEqual(['^build']);
  });

  it('pins typescript below 6 — `latest` breaks the Nx library generator', () => {
    // Measured 2026-07-28 in a real workspace: TypeScript 7.0.2 made
    // `nx g @nx/nest:library` die with "Cannot read properties of undefined
    // (reading 'Latest')", AFTER two app generations and a multi-minute install.
    const manifest = JSON.parse(nxWorkspaceFiles(tmp)['package.json']);
    expect(manifest.devDependencies.typescript).toBe('~5.9.0');
    expect(manifest.devDependencies.nx).toBe('latest');
  });

  it('takes the workspace name from the satellite manifest, sanitised for npm', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'My Sat' }));
    expect(nxWorkspaceName(tmp)).toBe('my-sat-workspace');
  });

  describe('canBootstrapNxWorkspace', () => {
    const makeSatellite = () =>
      fs.writeFileSync(path.join(tmp, 'evolith.yaml'), 'product:\n  name: my-sat\n');

    it('allows the tree `init` leaves behind — the case the whole gap is about', () => {
      makeSatellite();
      fs.mkdirSync(path.join(tmp, 'src'));

      expect(canBootstrapNxWorkspace(tmp)).toBe(true);
    });

    it('declines when src/ is another npm project — it does not convert it', () => {
      makeSatellite();
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'package.json'), '{"name":"somebody-elses-app"}');

      expect(canBootstrapNxWorkspace(tmp)).toBe(false);
    });

    it('declines outside a satellite — writing files takes a declaration first', () => {
      fs.mkdirSync(path.join(tmp, 'src'));

      expect(canBootstrapNxWorkspace(tmp)).toBe(false);
    });

    it('declines when the workspace is already there', () => {
      makeSatellite();
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'nx.json'), '{}');

      expect(canBootstrapNxWorkspace(tmp)).toBe(false);
    });
  });

  it('is idempotent and never overwrites a file that is already there', () => {
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(path.join(tmp, 'src', '.gitignore'), '# mine\n');

    const first = bootstrapNxWorkspace(tmp);
    expect(first.files).not.toContain('.gitignore');
    expect(fs.readFileSync(path.join(tmp, 'src', '.gitignore'), 'utf8')).toBe('# mine\n');

    const second = bootstrapNxWorkspace(tmp);
    expect(second).toEqual({ action: 'already-present', workspaceDir: nxWorkspaceDir(tmp), files: [] });
  });

  it('--dry-run reports what it would write and writes nothing', () => {
    const result = bootstrapNxWorkspace(tmp, { dryRun: true });

    expect(result.action).toBe('would-create');
    expect(result.files).toContain('nx.json');
    expect(fs.existsSync(nxWorkspaceDir(tmp))).toBe(false);
  });
});
