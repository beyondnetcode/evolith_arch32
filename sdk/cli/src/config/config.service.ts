import { Injectable, Logger } from '@nestjs/common';
import Conf from 'conf';

export interface EvolithConfig {
  version: string;
  lastUpdateCheck?: string;
  telemetryEnabled: boolean;
  knownSatellites: string[];
}

@Injectable()
export class ConfigService {
  private config: Conf<EvolithConfig>;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.config = new Conf<EvolithConfig>({
      projectName: 'evolith-cli',
      fileExtension: 'yaml',
      defaults: {
        version: '1.0.0',
        telemetryEnabled: true,
        knownSatellites: [],
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
