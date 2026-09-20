import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DEFAULT_PROFILE_NAME,
  PROFILE_STORE_DEFAULTS,
  ProfileStoreReader,
  getProfileConfig,
  listProfileNames,
  parseProfileStore,
  readProfileStore,
  resolveActiveProfile,
  resolveProfileStoreDir,
  resolveProfileStorePath,
  snapshotGetter,
} from './profile-store.service';

/**
 * GT-682 (#760). The reader is what lets the MCP `evolith-profile` tool answer
 * from the CLI's own store, so what is pinned here is the CONTRACT the CLI
 * relies on: where the file is per platform, that the body is JSON, and the
 * `EVOLITH_PROFILE` > stored > `default` precedence.
 */
describe('profile-store.service (GT-682 #760)', () => {
  describe('resolveProfileStoreDir — env-paths("evolith-cli").config, per platform', () => {
    const homedir = path.join('/home', 'ada');

    it('darwin → ~/Library/Preferences/evolith-cli-nodejs', () => {
      expect(resolveProfileStoreDir({ platform: 'darwin', env: {}, homedir })).toBe(
        path.join(homedir, 'Library', 'Preferences', 'evolith-cli-nodejs'),
      );
    });

    it('linux → $XDG_CONFIG_HOME/evolith-cli-nodejs, else ~/.config/evolith-cli-nodejs', () => {
      expect(resolveProfileStoreDir({ platform: 'linux', env: {}, homedir })).toBe(
        path.join(homedir, '.config', 'evolith-cli-nodejs'),
      );
      expect(resolveProfileStoreDir({ platform: 'linux', env: { XDG_CONFIG_HOME: '/xdg' }, homedir })).toBe(
        path.join('/xdg', 'evolith-cli-nodejs'),
      );
    });

    it('win32 → %APPDATA%/evolith-cli-nodejs/Config, else ~/AppData/Roaming/…', () => {
      expect(resolveProfileStoreDir({ platform: 'win32', env: { APPDATA: '/appdata' }, homedir })).toBe(
        path.join('/appdata', 'evolith-cli-nodejs', 'Config'),
      );
      expect(resolveProfileStoreDir({ platform: 'win32', env: {}, homedir })).toBe(
        path.join(homedir, 'AppData', 'Roaming', 'evolith-cli-nodejs', 'Config'),
      );
    });

    it('the store file is config.yaml inside that directory', () => {
      expect(resolveProfileStorePath({ platform: 'linux', env: {}, homedir })).toBe(
        path.join(homedir, '.config', 'evolith-cli-nodejs', 'config.yaml'),
      );
    });
  });

  describe('parseProfileStore — the body is JSON, whatever the extension says', () => {
    it('parses what conf writes (JSON with tab indentation)', () => {
      const text = JSON.stringify({ activeProfile: 'ci', profiles: { default: {}, ci: { tenant: 'acme' } } }, undefined, '\t');
      expect(parseProfileStore(text)).toEqual({ activeProfile: 'ci', profiles: { default: {}, ci: { tenant: 'acme' } } });
    });

    it('an empty body is an empty store', () => {
      expect(parseProfileStore('')).toEqual({});
      expect(parseProfileStore('   \n')).toEqual({});
    });

    it('rejects a non-object document and malformed JSON', () => {
      expect(() => parseProfileStore('[1,2]')).toThrow(/JSON object/);
      expect(() => parseProfileStore('"s"')).toThrow(/JSON object/);
      expect(() => parseProfileStore('activeProfile: ci')).toThrow();
    });
  });

  describe('resolution over a getter', () => {
    const store = snapshotGetter({ activeProfile: 'staging', profiles: { default: {}, staging: { core: '../core' } } });

    it('EVOLITH_PROFILE beats the stored activeProfile, which beats default', () => {
      expect(resolveActiveProfile(store, { EVOLITH_PROFILE: 'ci' })).toBe('ci');
      expect(resolveActiveProfile(store, {})).toBe('staging');
      expect(resolveActiveProfile(snapshotGetter({}), {})).toBe(DEFAULT_PROFILE_NAME);
      expect(resolveActiveProfile(snapshotGetter({ activeProfile: '' }), {})).toBe(DEFAULT_PROFILE_NAME);
    });

    it('lists the stored names, or [default] for a store with none', () => {
      expect(listProfileNames(store)).toEqual(['default', 'staging']);
      expect(listProfileNames(snapshotGetter({}))).toEqual(Object.keys(PROFILE_STORE_DEFAULTS.profiles));
      expect(listProfileNames(snapshotGetter({ profiles: ['not', 'an', 'object'] }))).toEqual(['default']);
    });

    it('returns the named profile, the active one by default, {} for an unknown one', () => {
      expect(getProfileConfig(store, 'staging', {})).toEqual({ core: '../core' });
      expect(getProfileConfig(store, undefined, {})).toEqual({ core: '../core' });
      expect(getProfileConfig(store, undefined, { EVOLITH_PROFILE: 'default' })).toEqual({});
      expect(getProfileConfig(store, 'nope', {})).toEqual({});
    });
  });

  describe('ProfileStoreReader — read-only, re-reads on every call', () => {
    let dir: string;
    let file: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-profile-store-'));
      file = path.join(dir, 'config.yaml');
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('a missing file resolves to the defaults and is NOT created', () => {
      const reader = new ProfileStoreReader({ path: file, env: {} });
      expect(reader.activeProfile()).toBe('default');
      expect(reader.listProfiles()).toEqual(['default']);
      expect(reader.getProfile()).toEqual({});
      expect(reader.profileExists('default')).toBe(true);
      expect(fs.existsSync(file)).toBe(false);
    });

    it('sees a switch the CLI made after the reader was constructed', () => {
      fs.writeFileSync(file, JSON.stringify({ activeProfile: 'default', profiles: { default: {}, prod: { tenant: 'acme' } } }));
      const reader = new ProfileStoreReader({ path: file, env: {} });
      expect(reader.activeProfile()).toBe('default');

      fs.writeFileSync(file, JSON.stringify({ activeProfile: 'prod', profiles: { default: {}, prod: { tenant: 'acme' } } }));
      expect(reader.activeProfile()).toBe('prod');
      expect(reader.getProfile()).toEqual({ tenant: 'acme' });
      expect(reader.listProfiles()).toEqual(['default', 'prod']);
    });

    it('honours EVOLITH_PROFILE from the env it was given', () => {
      fs.writeFileSync(file, JSON.stringify({ activeProfile: 'default', profiles: { default: {}, ci: { core: '/core' } } }));
      const reader = new ProfileStoreReader({ path: file, env: { EVOLITH_PROFILE: 'ci' } });
      expect(reader.activeProfile()).toBe('ci');
      expect(reader.getProfile()).toEqual({ core: '/core' });
    });

    it('surfaces a corrupt store instead of masking it as defaults', () => {
      fs.writeFileSync(file, '{ not json');
      expect(() => readProfileStore(file)).toThrow();
      expect(() => new ProfileStoreReader({ path: file, env: {} }).listProfiles()).toThrow();
    });

    it('defaults its path to the platform location', () => {
      const reader = new ProfileStoreReader({ env: {} });
      expect(reader.path).toBe(resolveProfileStorePath({ env: {} }));
    });
  });
});
