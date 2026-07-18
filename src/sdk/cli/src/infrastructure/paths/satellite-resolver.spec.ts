import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import {
  findNearestEvolithYaml,
  resolveSatelliteDetailed,
  resolveSatellitePath,
} from './satellite-resolver';

/**
 * GT-562 — ADR-0109 satellite resolution decides WHICH PROJECT gets governed by
 * `validate`, `gate`, `phase` and `upgrade`. The precedence order is the whole
 * contract, and its lower rungs (the `profile.satellite` fallback, the terminal
 * `cwd` fallback) were uncovered.
 *
 * The consequence of a regression is not a crash: the command runs happily
 * against the WRONG directory and reports a clean verdict for a project nobody
 * asked about. So each test pins one rung of the order and asserts both the
 * resolved path AND the `source` that explains it.
 */
describe('ADR-0109 satellite resolution', () => {
  let root: string;
  let nested: string;

  beforeEach(() => {
    // <root>/evolith.yaml  +  <root>/a/b  (no evolith.yaml below root)
    root = mkdtempSync(path.join(tmpdir(), 'evolith-sat-'));
    nested = path.join(root, 'a', 'b');
    mkdirSync(nested, { recursive: true });
    writeFileSync(path.join(root, 'evolith.yaml'), 'name: demo\n', 'utf8');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('findNearestEvolithYaml', () => {
    it('returns the directory itself when it holds the manifest', () => {
      expect(findNearestEvolithYaml(root)).toBe(root);
    });

    it('walks up to the nearest ancestor holding the manifest', () => {
      // This is what makes `cd a/b && evolith upgrade` govern the project root
      // rather than the subdirectory the user happened to stand in.
      expect(findNearestEvolithYaml(nested)).toBe(root);
    });

    it('returns undefined rather than the filesystem root when no manifest exists anywhere above', () => {
      const orphan = mkdtempSync(path.join(tmpdir(), 'evolith-orphan-'));
      try {
        // Terminating at the root is the branch that stops an unbounded walk;
        // returning a bogus ancestor here would govern an arbitrary directory.
        expect(findNearestEvolithYaml(orphan)).toBeUndefined();
      } finally {
        rmSync(orphan, { recursive: true, force: true });
      }
    });
  });

  describe('resolveSatelliteDetailed precedence', () => {
    it('prefers an explicit --satellite over every other source', () => {
      const result = resolveSatelliteDetailed({
        explicit: nested,
        profileSatellite: '/from/profile',
        cwd: root,
      });

      expect(result).toEqual({ path: nested, source: 'explicit' });
    });

    it('resolves an explicit relative path to an absolute one', () => {
      const result = resolveSatelliteDetailed({ explicit: 'relative/project' });

      expect(path.isAbsolute(result.path)).toBe(true);
      expect(result.path).toBe(path.resolve('relative/project'));
    });

    it('falls back to the nearest ancestor manifest when no --satellite is given', () => {
      const result = resolveSatelliteDetailed({ cwd: nested, profileSatellite: '/from/profile' });

      // The ancestor must WIN over profile.satellite: standing inside a project
      // and running the command must govern that project.
      expect(result).toEqual({ path: root, source: 'ancestor' });
    });

    it('falls back to profile.satellite when no manifest is found above cwd', () => {
      const orphan = mkdtempSync(path.join(tmpdir(), 'evolith-orphan-'));
      try {
        const result = resolveSatelliteDetailed({ cwd: orphan, profileSatellite: '/from/profile' });

        expect(result).toEqual({ path: path.resolve('/from/profile'), source: 'profile' });
      } finally {
        rmSync(orphan, { recursive: true, force: true });
      }
    });

    it('falls back to cwd last, and labels it as such so a command can report the miss', () => {
      const orphan = mkdtempSync(path.join(tmpdir(), 'evolith-orphan-'));
      try {
        const result = resolveSatelliteDetailed({ cwd: orphan });

        expect(result).toEqual({ path: path.resolve(orphan), source: 'cwd' });
      } finally {
        rmSync(orphan, { recursive: true, force: true });
      }
    });

    it('defaults cwd to process.cwd() when the caller supplies no input at all', () => {
      jest.spyOn(process, 'cwd').mockReturnValue(nested);

      // The no-argument call is the default-parameter branch; it must resolve
      // from the real working directory, not from undefined.
      expect(resolveSatelliteDetailed()).toEqual({ path: root, source: 'ancestor' });
    });

    it('treats an empty explicit value as absent rather than resolving it to cwd', () => {
      const result = resolveSatelliteDetailed({ explicit: '', cwd: nested });

      expect(result.source).toBe('ancestor');
      expect(result.path).toBe(root);
    });
  });

  describe('resolveSatellitePath', () => {
    it('returns just the path from the detailed resolution', () => {
      expect(resolveSatellitePath({ explicit: nested })).toBe(nested);
    });

    it('resolves from process.cwd() when called with no input', () => {
      jest.spyOn(process, 'cwd').mockReturnValue(nested);

      expect(resolveSatellitePath()).toBe(root);
    });
  });
});
