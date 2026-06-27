/**
 * EvolithRestClient — typed fetch wrapper for the Evolith Core REST API.
 *
 * Endpoints follow NestJS versioning: /v1/<resource>.
 * All responses are unwrapped from the ApiEnvelope<T> before returning.
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

export interface EvolithRestClientOptions {
  /** Base URL for the Evolith Core API, e.g. http://localhost:3000 */
  baseUrl: string;
  /** Bearer token for Authorization header */
  apiKey?: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch;
  /** Default request timeout in milliseconds (default: 30_000) */
  timeoutMs?: number;
}

export class EvolithRestClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: EvolithRestClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    };
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
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
   * POST /v1/projects/init
   */
  async initProject(body: InitProjectRequest): Promise<InitProjectResponse> {
    return this.post<InitProjectResponse>('/v1/projects/init', body);
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
    const url = `${this.baseUrl}${path}`;
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
