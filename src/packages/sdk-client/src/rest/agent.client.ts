import type { AgentRuntimeRequestWire, AgentRuntimeResult } from '@beyondnet/evolith-agent-runtime';

export class AgentClient {
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
   * Run a request through the governed pipeline.
   * POST /v1/agent/handle
   */
  async handle(input: AgentRuntimeRequestWire): Promise<AgentRuntimeResult> {
    const res = await fetch(`${this.baseUrl}/v1/agent/handle`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Agent handle failed: ${res.status}`);
    return res.json();
  }

  /**
   * List the available capabilities (catalog).
   * GET /v1/agent/skills
   */
  async getSkills(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/v1/agent/skills`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Agent list skills failed: ${res.status}`);
    return res.json();
  }
}
