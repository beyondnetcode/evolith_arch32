export type SatelliteStatus = 'provisioning' | 'active' | 'linked' | 'error' | 'archived';
export type SatelliteMode = 'create' | 'adopt';
export type SatelliteTopology = 'monolith' | 'modular' | 'micro' | 'distributed' | 'custom';

export interface SatelliteRecord {
  id: string;
  name: string;
  owner: string;
  repoUrl: string;
  cloneUrl: string;
  sshUrl: string;
  topology: SatelliteTopology | string;
  phase: string;
  status: SatelliteStatus;
  mode: SatelliteMode;
  coreVersion?: string;
  parentCorePath?: string;
  description?: string;
  linkedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SatelliteRegistryEntry {
  satellite: SatelliteRecord;
  registeredBy: string;
  registeredAt: string;
  lastSyncAt?: string;
}

export interface InitializeSatelliteInput {
  mode: SatelliteMode;
  name: string;
  owner: string;
  topology: string;
  phase: string;
  description?: string;
  private?: boolean;
  coreVersion?: string;
  existingRepoUrl?: string;
}

export interface InitializeSatelliteOutput {
  satellite: SatelliteRecord;
  outputEnvelope: {
    success: boolean;
    data: { satellite: SatelliteRecord };
    meta: {
      requestId: string;
      timestamp: string;
      version: string;
    };
  };
}
