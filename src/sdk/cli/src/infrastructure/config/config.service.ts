import { Injectable, Logger } from '@nestjs/common';
import { Conf, type ConfInstance } from './conf-module';

export interface SyncConfig {
  upstreamRoot: string;
  files: string[];
}

export interface ProfileConfig {
  core?: string;
  satellite?: string;
  tenant?: string;
  initiative?: string;
  /**
   * GT-661 — the ruleset refs THIS TENANT has adopted.
   *
   * The principle the Core is built to: **the Core PROPOSES; the Tracker, CLI
   * and MCP configure and select.** Until this field existed the CLI could only
   * pass a selection somebody typed on the command line, which is not
   * configuration — it is a flag a person has to remember on every invocation,
   * and one they will eventually forget on the run that mattered.
   *
   * `--select` still wins when given: an explicit argument is a deliberate act
   * and must be able to override a stored default, including to widen it.
   * Absent from both, the Core evaluates its whole corpus and SAYS SO
   * (`selection.source: 'core-default'`) — the default is not changed here,
   * because a default that stopped blocking would silently disarm every gate
   * working today.
   *
   * Read `evolith rulesets` for the refs this Core accepts.
   */
  select?: string[];
}

export interface EvolithConfig {
  version: string;
  lastUpdateCheck?: string;
  telemetryEnabled: boolean;
  knownSatellites: string[];
  sync: SyncConfig;
}

const DEFAULT_PROFILE = 'default';

@Injectable()
export class ConfigService {
  private config: ConfInstance<Record<string, unknown>>;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.config = new Conf<Record<string, unknown>>({
      projectName: 'evolith-cli',
      fileExtension: 'yaml',
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
        activeProfile: DEFAULT_PROFILE,
        profiles: {
          [DEFAULT_PROFILE]: {},
        },
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

  activeProfile(): string {
    const envProfile = process.env.EVOLITH_PROFILE;
    if (envProfile) return envProfile;
    return (this.config.get('activeProfile') as string) || DEFAULT_PROFILE;
  }

  listProfiles(): string[] {
    const profiles = this.config.get('profiles') as Record<string, ProfileConfig> | undefined;
    return Object.keys(profiles || { [DEFAULT_PROFILE]: {} });
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
    const profileName = name || this.activeProfile();
    const profiles = (this.config.get('profiles') as Record<string, ProfileConfig>) || {};
    return profiles[profileName] || {};
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
