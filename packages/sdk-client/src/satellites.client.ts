/**
 * SatellitesClient — typed fetch wrapper for the Evolith Core satellite registry endpoints.
 *
 * Mirrors types from packages/core-domain/src/domain/satellite-record.ts.
 * Follows the same envelope pattern as EvolithRestClient: every successful
 * response is { success: true, data: ..., meta: ... }.
 */

// ─── Satellite types (mirror of @evolith/core-domain satellite-record.ts) ─────

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

/** Input shape for registering a satellite via the REST API. */
export type RegisterSatelliteInput = Omit<InitializeSatelliteInput, 'mode'> & {
  mode?: string;
  repoUrl: string;
  cloneUrl: string;
  sshUrl: string;
};

// ─── SatellitesClient ─────────────────────────────────────────────────────────

export class SatellitesClient {
  private readonly baseUrl: string;
  private readonly _headers: Record<string, string>;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this._headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  private get headers(): Record<string, string> {
    return this._headers;
  }

  /**
   * Register a new satellite.
   * POST /api/v1/satellites
   */
  async register(input: RegisterSatelliteInput): Promise<SatelliteRecord> {
    const res = await fetch(`${this.baseUrl}/api/v1/satellites`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Register satellite failed: ${res.status}`);
    const envelope = await res.json();
    return envelope.data.satellite;
  }

  /**
   * List all registered satellites.
   * GET /api/v1/satellites
   */
  async list(): Promise<SatelliteRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/satellites`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`List satellites failed: ${res.status}`);
    const envelope = await res.json();
    return envelope.data.satellites;
  }

  /**
   * Get a satellite by ID. Returns null when the satellite is not found (404).
   * GET /api/v1/satellites/:id
   */
  async get(id: string): Promise<SatelliteRecord | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/satellites/${encodeURIComponent(id)}`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Get satellite failed: ${res.status}`);
    const envelope = await res.json();
    return envelope.data.satellite;
  }

  /**
   * Partially update a satellite.
   * PATCH /api/v1/satellites/:id
   */
  async update(id: string, patch: Partial<SatelliteRecord>): Promise<SatelliteRecord> {
    const res = await fetch(`${this.baseUrl}/api/v1/satellites/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Update satellite failed: ${res.status}`);
    const envelope = await res.json();
    return envelope.data.satellite;
  }

  /**
   * Link a satellite to another satellite.
   * POST /api/v1/satellites/:id/link
   */
  async link(id: string, targetSatelliteId: string): Promise<SatelliteRecord> {
    const res = await fetch(`${this.baseUrl}/api/v1/satellites/${encodeURIComponent(id)}/link`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ targetSatelliteId }),
    });
    if (!res.ok) throw new Error(`Link satellite failed: ${res.status}`);
    const envelope = await res.json();
    return envelope.data.satellite;
  }
}
