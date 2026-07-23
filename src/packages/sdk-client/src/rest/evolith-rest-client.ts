/**
 * EvolithRestClient — typed fetch wrapper for the Evolith Core REST API.
 *
 * core-api enables URI versioning with the global prefix `api/v` (see
 * apps/core-api/src/main.ts), so live routes are `/api/v1/<resource>`. The
 * client prepends `apiPrefix` (default `/api`) to every path.
 * Each method returns the full SuccessEnvelope<T> ({ success, data, meta });
 * non-2xx responses throw EvolithApiError.
 */

import type {
  GatePhase,
  EvaluateGateRequest,
  EvaluateGateResponse,
  TransitionPhaseRequest,
  TransitionPhaseResponse,
  ListTopologiesResponse,
  GetTopologyResponse,
  ValidateSatelliteRequest,
  ValidateSatelliteResponse,
  DetectDriftRequest,
  DetectDriftResponse,
  InitProjectRequest,
  InitProjectResponse,
  ProposeAdvanceRequest,
  ProposeAdvanceResponse,
} from './types.js';
import { SatellitesClient } from '../satellites.client.js';
import { AgentClient } from './agent.client.js';

export interface EvolithRestClientOptions {
  /** Base URL for the Evolith Core API, e.g. http://localhost:3000 */
  baseUrl: string;
  /** Base URL for the Agent Runtime API (defaults to baseUrl) */
  agentUrl?: string;
  /** Bearer token for Authorization header */
  apiKey?: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch;
  /** Default request timeout in milliseconds (default: 30_000) */
  timeoutMs?: number;
  /** Global API prefix prepended to every path (default '/api', matching core-api's `api/v` versioning). */
  apiPrefix?: string;
}

export class EvolithRestClient {
  private readonly baseUrl: string;
  private readonly apiPrefix: string;
  private readonly headers: Record<string, string>;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  /** Satellites CRUD sub-client. */
  readonly satellites: SatellitesClient;
  
  /** Agent Runtime sub-client. */
  readonly agent: AgentClient;

  constructor(private readonly options: EvolithRestClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    // Trim leading/trailing slashes WITHOUT a backtracking regex (ReDoS-safe).
    let prefix = options.apiPrefix ?? '/api';
    while (prefix.startsWith('/')) prefix = prefix.slice(1);
    while (prefix.endsWith('/')) prefix = prefix.slice(0, -1);
    this.apiPrefix = prefix ? `/${prefix}` : '';
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    };
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? (Number(process.env.EVOLITH_API_TIMEOUT_MS) || 30_000);
    this.satellites = new SatellitesClient(this.baseUrl, options.apiKey);
    this.agent = new AgentClient(options.agentUrl || this.baseUrl, options.apiKey);
  }

  // ─── Gates ───────────────────────────────────────────────────────────────

  /**
   * Evaluate a specific SDLC phase gate.
   * POST /v1/gates/:gateId/evaluate
   */
  async evaluateGate(gateId: string, body: EvaluateGateRequest): Promise<EvaluateGateResponse> {
    return this.post<EvaluateGateResponse>(`/v1/gates/${encodeURIComponent(gateId)}/evaluate`, body);
  }

  /**
   * Convenience: evaluate by phase name instead of gateId.
   */
  async evaluatePhaseGate(phase: GatePhase, body: EvaluateGateRequest): Promise<EvaluateGateResponse> {
    const phaseToGateId: Record<GatePhase, string> = {
      discovery: 'PG1-01',
      design: 'PG2-01',
      construction: 'PG3-01',
      qa: 'PG4-01',
      release: 'PG5-01',
    };
    return this.evaluateGate(phaseToGateId[phase], body);
  }

  // ─── Phases ──────────────────────────────────────────────────────────────

  /**
   * Execute a phase transition.
   * POST /v1/phases/transition
   */
  async transitionPhase(body: TransitionPhaseRequest): Promise<TransitionPhaseResponse> {
    return this.post<TransitionPhaseResponse>('/v1/phases/transition', body);
  }

  // ─── Architecture / Topology ─────────────────────────────────────────────

  /**
   * List all available architecture topologies.
   * GET /v1/architecture/topologies
   */
  async listTopologies(): Promise<ListTopologiesResponse> {
    return this.get<ListTopologiesResponse>('/v1/architecture/topologies');
  }

  /**
   * Get a specific architecture topology by ID.
   * GET /v1/architecture/topologies/:id
   */
  async getTopology(id: string): Promise<GetTopologyResponse> {
    return this.get<GetTopologyResponse>(`/v1/architecture/topologies/${encodeURIComponent(id)}`);
  }

  /**
   * Validate a satellite project against architecture rules.
   * POST /v1/architecture/validate-satellite
   */
  async validateSatellite(body: ValidateSatelliteRequest): Promise<ValidateSatelliteResponse> {
    return this.post<ValidateSatelliteResponse>('/v1/architecture/validate-satellite', body);
  }

  /**
   * Detect architecture drift in a project.
   * POST /v1/architecture/detect-drift
   */
  async detectDrift(body: DetectDriftRequest): Promise<DetectDriftResponse> {
    return this.post<DetectDriftResponse>('/v1/architecture/detect-drift', body);
  }

  /**
   * Invalidate topology cache.
   * POST /v1/architecture/cache/invalidate
   */
  async invalidateTopologyCache(): Promise<{ invalidated: boolean; keys: string[] }> {
    return this.post<{ invalidated: boolean; keys: string[] }>('/v1/architecture/cache/invalidate', {});
  }

  // ─── Projects ────────────────────────────────────────────────────────────

  /**
   * Initialize a new project.
   * POST /v1/projects/initialize
   */
  async initProject(body: InitProjectRequest): Promise<InitProjectResponse> {
    return this.post<InitProjectResponse>('/v1/projects/initialize', body);
  }

  /**
   * Propose a phase advance.
   * POST /v1/projects/propose-advance
   */
  async proposeAdvance(body: ProposeAdvanceRequest): Promise<ProposeAdvanceResponse> {
    return this.post<ProposeAdvanceResponse>('/v1/projects/propose-advance', body);
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path, undefined);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${this.apiPrefix}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(url, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new EvolithApiError(response.status, response.statusText, text, url);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class EvolithApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Evolith API error ${status} (${statusText}) for ${url}: ${body}`);
    this.name = 'EvolithApiError';
  }
}
