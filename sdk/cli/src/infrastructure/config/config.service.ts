import { Injectable, Logger } from '@nestjs/common';
import Conf from 'conf';

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

@Injectable()
export class ConfigService {
  private config: Conf<any>;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.config = new Conf<any>({
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
            '.harness/rules/global-rules.md'
          ]
        }
      },
    });
    this.logger.debug(`Config loaded from: ${this.config.path}`);
  }

  get<K extends keyof EvolithConfig>(key: K): EvolithConfig[K] {
    return this.config.get(key);
  }

  set<K extends keyof EvolithConfig>(key: K, value: EvolithConfig[K]): void {
    this.config.set(key, value);
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
}
