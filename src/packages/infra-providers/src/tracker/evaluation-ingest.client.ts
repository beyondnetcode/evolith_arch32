/**
 * GT-604 — the ONE client every verdict-producing surface deposits through.
 *
 * The state this closes
 * ---------------------
 * The evidence write path pointed only INWARD: the Tracker opened transactions
 * against the Core and the Core had nowhere to put its verdicts. Every
 * `evolith evaluate`, every `enforce edit` veto, every MCP `tools/call` and every
 * drift-gate run produced a complete, owner-attributed, engine-attributed verdict
 * and then evaporated on process exit. The Tracker side of GT-604 added the route;
 * this is the caller.
 *
 * Why ONE client and not one per surface
 * --------------------------------------
 * Three surfaces each writing their own `fetch` is three chances to drop
 * `rulesExecuted[].engine`, to send `owner` where the wire says `accountableOwner`,
 * or to put a `tenantId` in the body — and the third is a security hole, not a
 * typo: the Tracker derives the tenant from WHICH machine key matched, so a
 * body-supplied tenant would let one key deposit into another tenant's ledger.
 * The payload is built exactly once, by `toEvaluationIngestPayload` from
 * `@beyondnet/evolith-contracts/ingest`, which is the same module the Tracker's
 * own conformance test pins.
 *
 * Why a failed deposit never changes a verdict
 * --------------------------------------------
 * Depositing evidence is not a gate. If the Tracker is down, `evolith evaluate`
 * must still print its verdict and still exit non-zero when it BLOCKS: making the
 * gate depend on the ledger's availability would mean an outage silently opens the
 * gate — the exact inversion a governance product cannot afford. So
 * {@link depositEvaluation} reports the failure on the caller's warning channel
 * and returns `{ deposited: false }`. It is reported and never swallowed: a
 * deposit path that fails quietly is indistinguishable from one that was never
 * wired, which is the state this gap started from.
 *
 * Auth, verbatim from the precedent
 * ---------------------------------
 * Same shape `TrackerApprovalHttpClient` already uses for `POST /runtime-approvals`
 * (agent-runtime): the CoreMachine key travels in `x-api-key`, the tenant is
 * derived from the key and NEVER sent. Not configured means not deposited — a
 * surface without a Tracker URL is a surface running standalone, not a failure.
 */

import {
  toEvaluationIngestPayload,
  EVALUATION_INGEST_ENDPOINT_CONTRACT,
  type EvaluationIngestInput,
  type EvaluationIngestPayload,
  type EvaluationIngestSurface,
} from '@beyondnet/evolith-contracts/ingest';

// ---------------------------------------------------------------------------
// Transport seam
// ---------------------------------------------------------------------------

interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}

export type IngestFetchLike = (url: string, init: Record<string, unknown>) => Promise<FetchResponse>;

/** The Tracker's acknowledgement. `created` distinguishes a first deposit from a replay. */
export interface EvaluationIngestAck {
  readonly transactionId: string;
  readonly correlationId: string;
  readonly created: boolean;
}

export interface TrackerEvaluationIngestClientOptions {
  /** Tracker base URL INCLUDING the versioned prefix, e.g. `http://tracker-api:8080/api/v1`. */
  readonly baseUrl: string;
  /** CoreMachine key the Tracker binds to a tenant; sent as `x-api-key`. */
  readonly apiKey?: string;
  /** Abort the request after this many ms (default 10s). */
  readonly timeoutMs?: number;
  /** Inject a fetch implementation (defaults to global fetch). */
  readonly fetchImpl?: IngestFetchLike;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Raised when the Tracker refuses or fails a deposit. Carries the status for the caller's log. */
export class EvaluationIngestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'EvaluationIngestError';
  }
}

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------

export class TrackerEvaluationIngestClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: IngestFetchLike;

  constructor(options: TrackerEvaluationIngestClientOptions) {
    const globalFetch = (globalThis as { fetch?: IngestFetchLike }).fetch;
    const impl = options.fetchImpl ?? globalFetch;
    if (!impl) {
      throw new Error(
        'TrackerEvaluationIngestClient requires fetch (Node 18+) or an injected fetchImpl.',
      );
    }
    this.fetchImpl = impl;
    // The route is taken from the published contract rather than typed here, so a
    // path change upstream moves this client with it instead of leaving a caller
    // that 404s against a route nobody remembers renaming.
    this.endpoint = `${options.baseUrl.replace(/\/+$/, '')}${EVALUATION_INGEST_ENDPOINT_CONTRACT.path}`;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Where this client posts. Exposed so a caller can name it in a log line. */
  get url(): string {
    return this.endpoint;
  }

  /**
   * Build the payload from a verdict and POST it.
   *
   * The mapping is delegated entirely to the shared contract: this method never
   * reshapes a field, never coerces an engine and never adds a tenant.
   */
  async deposit(input: EvaluationIngestInput): Promise<EvaluationIngestAck> {
    return this.send(toEvaluationIngestPayload(input));
  }

  /** POST an already-built payload. Split out so a test can post a hand-made body. */
  async send(payload: EvaluationIngestPayload): Promise<EvaluationIngestAck> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: EVALUATION_INGEST_ENDPOINT_CONTRACT.method,
        headers: {
          'content-type': 'application/json',
          // The tenant rides on WHICH key matched. It is never in the body — see
          // the module header.
          ...(this.apiKey ? { [EVALUATION_INGEST_ENDPOINT_CONTRACT.auth.header]: this.apiKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = response.text ? await safeText(response) : '';
        throw new EvaluationIngestError(
          `Tracker refused the evaluation deposit (${response.status})${detail ? `: ${detail}` : ''}`,
          response.status,
        );
      }

      const body = (await response.json()) as Partial<EvaluationIngestAck> | null;
      return {
        transactionId: String(body?.transactionId ?? ''),
        // Fall back to what was sent rather than to an empty string: the caller
        // logs this id to join its local artifact to the ledger row.
        correlationId: String(body?.correlationId ?? payload.correlationId),
        created: body?.created === true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeText(response: FetchResponse): Promise<string> {
  try {
    return (await response.text!()).slice(0, 500);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Configuration — not configured is not a failure
// ---------------------------------------------------------------------------

/** Base URL of the Tracker, INCLUDING `/api/v1`. Absent means "do not deposit". */
export const EVOLITH_TRACKER_URL_ENV = 'EVOLITH_TRACKER_URL';

/** CoreMachine key. The Tracker resolves the tenant from it; it never travels in a body. */
export const EVOLITH_TRACKER_API_KEY_ENV = 'EVOLITH_TRACKER_API_KEY';

export interface IngestEnv {
  readonly [key: string]: string | undefined;
}

/**
 * Build a client from the environment, or `undefined` when the surface is not
 * configured to deposit.
 *
 * Returning `undefined` rather than a no-op client is deliberate: a no-op that
 * answers "deposited" would make an unconfigured deployment indistinguishable
 * from a working one, and this whole gap exists because nobody noticed evidence
 * going nowhere.
 *
 * A URL WITHOUT a key throws. That combination is always a misconfiguration — the
 * endpoint is machine-authenticated, so every request would 401 — and failing at
 * construction says so once instead of once per evaluation. Same posture as the
 * agent-runtime factory takes for `AGENT_RUNTIME_APPROVAL_TRACKER_URL`.
 */
export function createEvaluationIngestClientFromEnv(
  env: IngestEnv,
  options?: Omit<TrackerEvaluationIngestClientOptions, 'baseUrl' | 'apiKey'>,
): TrackerEvaluationIngestClient | undefined {
  const baseUrl = trimmed(env[EVOLITH_TRACKER_URL_ENV]);
  if (!baseUrl) return undefined;

  const apiKey = trimmed(env[EVOLITH_TRACKER_API_KEY_ENV]);
  if (!apiKey) {
    throw new Error(
      `${EVOLITH_TRACKER_URL_ENV} is set without ${EVOLITH_TRACKER_API_KEY_ENV}. The Tracker ` +
        'evaluation-ingest endpoint is machine-authenticated (CoreMachine key in x-api-key), so ' +
        'every deposit would be rejected with 401 and every verdict would still be lost.',
    );
  }

  return new TrackerEvaluationIngestClient({ ...options, baseUrl, apiKey });
}

function trimmed(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

// ---------------------------------------------------------------------------
// The surface-facing helper
// ---------------------------------------------------------------------------

export interface DepositOutcome {
  readonly deposited: boolean;
  readonly ack?: EvaluationIngestAck;
  /** Why it did not land. Present only when `deposited` is false AND it was attempted. */
  readonly error?: string;
}

export interface DepositEvaluationInput extends EvaluationIngestInput {
  /** `undefined` when the surface is not configured — then nothing is attempted. */
  readonly client?: TrackerEvaluationIngestClient;
  /** Where a failure is reported. Defaults to `console.warn` (stderr), never stdout. */
  readonly warn?: (message: string) => void;
}

/**
 * Deposit a verdict without ever letting the deposit change the verdict.
 *
 * Every surface calls THIS rather than `client.deposit` directly, so that the
 * "a ledger outage must not open a gate" rule is implemented once instead of
 * three times with two of them subtly different.
 *
 * The warning goes to `console.warn` — stderr — and never to stdout, because
 * `--format json` and `--format sarif` promise a parseable document on stdout and
 * a warning printed there would corrupt every consumer that pipes it.
 */
export async function depositEvaluation(input: DepositEvaluationInput): Promise<DepositOutcome> {
  const { client, warn, ...ingest } = input;
  if (!client) return { deposited: false };

  const report = warn ?? ((message: string) => console.warn(message));

  try {
    const ack = await client.deposit(ingest);
    return { deposited: true, ack };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report(
      `[evolith] evaluation evidence was NOT deposited in the Tracker (${client.url}): ${message}. ` +
        'The verdict above stands; only the ledger row is missing.',
    );
    return { deposited: false, error: message };
  }
}

export type { EvaluationIngestInput, EvaluationIngestPayload, EvaluationIngestSurface };
