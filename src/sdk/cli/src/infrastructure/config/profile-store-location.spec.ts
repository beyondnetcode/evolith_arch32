import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import {
  resolveProfileStoreDir,
  resolveProfileStorePath,
} from '@beyondnet/evolith-core-domain/application/services/profile-store.service';

/**
 * GT-682 (#760) — the profile store's LOCATION is now decided by core-domain
 * and handed to `conf` as `cwd` (see `config.service.ts`). Before this change
 * `conf` derived it from `projectName` through `env-paths`; if the reader's
 * reproduction of `env-paths` ever diverged, every existing profile would
 * "vanish" on the next CLI run — the file would still be on disk, unread.
 *
 * So this spec asks the REAL `env-paths` — the ESM package `conf` depends on,
 * run in a child process because this suite is CommonJS — and requires the
 * reader to agree with it on the running platform. `conf` itself is mocked in
 * this workspace's jest config, which is why the comparison is made one level
 * down, against the function `conf` would have called.
 */
describe('profile store location parity with env-paths (GT-682 #760)', () => {
  const REAL_ENV_PATHS_CONFIG = (() => {
    const script = "import envPaths from 'env-paths'; process.stdout.write(envPaths('evolith-cli').config);";
    return execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve(__dirname, '..', '..', '..'),
      encoding: 'utf8',
    }).trim();
  })();

  it('resolves the same directory conf would derive from projectName', () => {
    expect(REAL_ENV_PATHS_CONFIG.length).toBeGreaterThan(0);
    expect(resolveProfileStoreDir()).toBe(REAL_ENV_PATHS_CONFIG);
  });

  it('names the file exactly as conf did (configName + fileExtension)', () => {
    expect(resolveProfileStorePath()).toBe(path.join(REAL_ENV_PATHS_CONFIG, 'config.yaml'));
  });
});
