import { Injectable, Logger } from '@nestjs/common';
import {
  PROFILE_STORE_CONFIG_NAME,
  PROFILE_STORE_DEFAULTS,
  PROFILE_STORE_FILE_EXTENSION,
  PROFILE_STORE_PROJECT_NAME,
  getProfileConfig,
  listProfileNames,
  resolveActiveProfile,
  resolveProfileStoreDir,
  type ProfileConfig,
  type ProfileStoreGetter,
} from '@beyondnet/evolith-core-domain/application/services/profile-store.service';
import { Conf, type ConfInstance } from './conf-module';

// GT-682 (#760) — `ProfileConfig` (and the GT-661 note on `select`) moved to
// core-domain with the profile-store reader, so the MCP `evolith-profile` tool
// and this service type the same record. Re-exported: every command that
// imported it from here keeps compiling unchanged.
export type { ProfileConfig };

export interface SyncConfig {
  upstreamRoot: string;
  files: string[];
}

export interface EvolithConfig {
  version: string;
  lastUpdateCheck?: string;
  telemetryEnabled: boolean;
  knownSatellites: string[];
  sync: SyncConfig;
}

const DEFAULT_PROFILE = PROFILE_STORE_DEFAULTS.activeProfile;

@Injectable()
export class ConfigService {
  private config: ConfInstance<Record<string, unknown>>;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.config = new Conf<Record<string, unknown>>({
      projectName: PROFILE_STORE_PROJECT_NAME,
      // GT-682 (#760) — the location is DECIDED by core-domain's profile-store
      // reader and handed to `conf` as `cwd`, instead of letting `conf` derive it
      // from `projectName` on its own. Same directory as before — the reader
      // reproduces `env-paths`, and `profile-store-location.spec.ts` proves it
      // against the real package on the running platform. What changed is that
      // the MCP `evolith-profile` tool now reads the same file by calling the
      // same function, not by re-deriving it.
      cwd: resolveProfileStoreDir(),
      configName: PROFILE_STORE_CONFIG_NAME,
      fileExtension: PROFILE_STORE_FILE_EXTENSION,
      defaults: {
        version: '1.0.0',
        telemetryEnabled: true,
        knownSatellites: [],
        sync: {
          upstreamRoot: '',
          files: [
            'README.md',
            'README.es.md',
            'AGENTS.md',
            'AGENTS.es.md',
            'LICENSE',
            '.harness/rules/global-rules.md',
          ],
        },
        activeProfile: PROFILE_STORE_DEFAULTS.activeProfile,
        profiles: { ...PROFILE_STORE_DEFAULTS.profiles },
      },
    });
    this.logger.debug(`Config loaded from: ${this.config.path}`);
  }

  get<K extends keyof EvolithConfig>(key: K): EvolithConfig[K] {
    return this.config.get(key as string) as EvolithConfig[K];
  }

  set<K extends keyof EvolithConfig>(key: K, value: EvolithConfig[K]): void {
    this.config.set(key as string, value);
  }

  addSatellite(path: string): void {
    const satellites = this.get('knownSatellites') || [];
    if (!satellites.includes(path)) {
      satellites.push(path);
      this.set('knownSatellites', satellites);
    }
  }

  get configPath(): string {
    return this.config.path;
  }

  /**
   * GT-682 (#760) — the reads below go through core-domain's profile-store
   * resolvers, fed by this live `conf` instance. The MCP `evolith-profile` tool
   * calls the same resolvers over a parsed snapshot of the same file, so the
   * `EVOLITH_PROFILE` > stored > `default` precedence exists in one place.
   */
  private readonly storeGetter: ProfileStoreGetter = (key) => this.config.get(key);

  activeProfile(): string {
    return resolveActiveProfile(this.storeGetter, process.env);
  }

  listProfiles(): string[] {
    return listProfileNames(this.storeGetter);
  }

  profileExists(name: string): boolean {
    return this.listProfiles().includes(name);
  }

  createProfile(name: string, config?: ProfileConfig): void {
    if (this.profileExists(name)) {
      throw new Error(`Profile "${name}" already exists`);
    }
    const profiles = (this.config.get('profiles') as Record<string, ProfileConfig>) || {};
    profiles[name] = config || {};
    this.config.set('profiles', profiles);
  }

  switchProfile(name: string): void {
    if (!this.profileExists(name)) {
      throw new Error(`Profile "${name}" does not exist`);
    }
    this.config.set('activeProfile', name);
  }

  deleteProfile(name: string): void {
    if (name === DEFAULT_PROFILE) {
      throw new Error('Cannot delete the default profile');
    }
    const profiles = (this.config.get('profiles') as Record<string, ProfileConfig>) || {};
    if (!profiles[name]) {
      throw new Error(`Profile "${name}" does not exist`);
    }
    const active = this.activeProfile();
    delete profiles[name];
    this.config.set('profiles', profiles);
    if (active === name) {
      this.config.set('activeProfile', DEFAULT_PROFILE);
    }
  }

  getProfile(name?: string): ProfileConfig {
    return getProfileConfig(this.storeGetter, name, process.env);
  }

  setProfileValue(name: string, key: string, value: unknown): void {
    const profiles = (this.config.get('profiles') as Record<string, Record<string, unknown>>) || {};
    if (!profiles[name]) {
      profiles[name] = {};
    }
    profiles[name][key] = value;
    this.config.set('profiles', profiles);
  }
}
