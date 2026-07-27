/**
 * GT-575 — governed LLM egress controls.
 *
 * Pure, provider-neutral primitives that every outbound call to an external LLM
 * MUST pass through before a single byte leaves the process:
 *   1. redact credentials and sensitive patterns from the payload,
 *   2. bound the payload by measurable byte/token budgets and FAIL CLOSED when
 *      it does not fit (never silently truncate a governed prompt),
 *   3. validate whatever comes back against a declared schema instead of
 *      casting a `JSON.parse` result,
 *   4. emit an auditable, content-free egress record for every attempt —
 *      including the attempts that were refused.
 *
 * This is a direct TypeScript port of the controls the repository already
 * implements for its own CI reviewer in `.harness/scripts/ci/agentic/`
 * (`review-input.mjs` redaction + budget, `review-provider.mjs` header auth,
 * `13-agentic-code-review.mjs` fail-closed ceiling). It is the SAME posture,
 * applied to the code that actually ships.
 *
 * No network, no vendor coupling — safe to unit test in isolation.
 */

export const REDACTION = '«REDACTED»';

interface SecretRule {
  readonly re: RegExp;
  readonly replacement: string;
}

/**
 * The eight secret classes redacted before egress. Kept byte-for-byte
 * equivalent to `.harness/scripts/ci/agentic/review-input.mjs` so the shipped
 * path and the CI path cannot drift apart.
 */
const SECRET_PATTERNS: readonly SecretRule[] = [
  // PEM private keys (any flavor)
  {
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
    replacement: '«REDACTED:private-key»',
  },
  // JWT (header.payload.signature)
  { re: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, replacement: '«REDACTED:jwt»' },
  // AWS access key id
  { re: /\bAKIA[0-9A-Z]{16}\b/g, replacement: '«REDACTED:aws-access-key»' },
  // Google API key
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: '«REDACTED:google-api-key»' },
  // GitHub PAT
  { re: /\bghp_[A-Za-z0-9]{36}\b/g, replacement: '«REDACTED:github-token»' },
  // Slack token
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, replacement: '«REDACTED:slack-token»' },
  // Bearer tokens
  { re: /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/g, replacement: `Bearer ${REDACTION}` },
  // Generic secret assignments: FOO_API_KEY = "..." / token: '...'
  {
    re: /\b([A-Za-z0-9_]*(?:API|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|KEY)[A-Za-z0-9_]*)(\s*[:=]\s*)["']?([A-Za-z0-9_\-./+=]{12,})["']?/gi,
    replacement: `$1$2${REDACTION}`,
  },
];

export interface RedactionResult {
  readonly text: string;
  /** How many secrets were replaced (aggregate telemetry — never the values). */
  readonly redactions: number;
}

/** Redact known secret patterns. Returns the sanitized text and a match count. */
export function redactSecrets(input: unknown): RedactionResult {
  let text = typeof input === 'string' ? input : String(input ?? '');
  let redactions = 0;
  for (const { re, replacement } of SECRET_PATTERNS) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (!matches || matches.length === 0) continue;
    redactions += matches.length;
    re.lastIndex = 0;
    text = text.replace(re, replacement);
  }
  return { text, redactions };
}

/** Coarse token estimate (~4 bytes/token); deterministic and provider-agnostic. */
export function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(String(text ?? ''), 'utf8') / 4);
}

export interface EgressBudget {
  readonly maxBytes: number;
  readonly maxTokens: number;
}

/** Same defaults as the CI reviewer's per-chunk budget. */
export const DEFAULT_EGRESS_BUDGET: EgressBudget = { maxBytes: 60_000, maxTokens: 15_000 };

export interface EgressBudgetUsage {
  readonly bytes: number;
  readonly estTokens: number;
}

/** Base class for every refusal/failure on the governed egress path. */
export class LlmEgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmEgressError';
  }
}

/** The provider is not armed (feature flag off) — the default state. */
export class LlmEgressDisabledError extends LlmEgressError {
  constructor(message: string) {
    super(message);
    this.name = 'LlmEgressDisabledError';
  }
}

/**
 * The call is not SUPERVISED (GT-575): no human gate ran in front of it.
 *
 * A governed provider opens a socket only when an upstream
 * `SupervisedAssistantClient` already granted (the decision travels on the
 * invocation) or when it was itself given an `IApprovalPort` that grants. A
 * caller holding a bare provider gets this instead of an ungoverned request.
 */
export class LlmEgressUnsupervisedError extends LlmEgressError {
  constructor(message: string) {
    super(message);
    this.name = 'LlmEgressUnsupervisedError';
  }
}

/** Credentials / endpoint configuration missing or invalid. */
export class LlmEgressConfigurationError extends LlmEgressError {
  constructor(message: string) {
    super(message);
    this.name = 'LlmEgressConfigurationError';
  }
}

/** The payload exceeds the declared budget. Fail closed: nothing is sent. */
export class LlmEgressBudgetError extends LlmEgressError {
  constructor(
    message: string,
    readonly usage: EgressBudgetUsage,
    readonly budget: EgressBudget,
  ) {
    super(message);
    this.name = 'LlmEgressBudgetError';
  }
}

/** The response did not conform to the declared schema. */
export class LlmResponseSchemaError extends LlmEgressError {
  constructor(
    message: string,
    readonly errors: readonly string[],
  ) {
    super(`${message}: ${errors.join('; ')}`);
    this.name = 'LlmResponseSchemaError';
  }
}

/**
 * Measure a payload against the budget. Throws {@link LlmEgressBudgetError}
 * rather than truncating — a governed prompt that does not fit must not be
 * silently mutated into a different prompt.
 */
export function enforceEgressBudget(
  payload: string,
  budget: EgressBudget = DEFAULT_EGRESS_BUDGET,
): EgressBudgetUsage {
  const bytes = Buffer.byteLength(payload, 'utf8');
  const estTokens = Math.ceil(bytes / 4);
  const usage: EgressBudgetUsage = { bytes, estTokens };
  if (bytes > budget.maxBytes) {
    throw new LlmEgressBudgetError(
      `LLM egress payload of ${bytes} bytes exceeds the ${budget.maxBytes}-byte budget. Failing closed.`,
      usage,
      budget,
    );
  }
  if (estTokens > budget.maxTokens) {
    throw new LlmEgressBudgetError(
      `LLM egress payload of ~${estTokens} tokens exceeds the ${budget.maxTokens}-token budget. Failing closed.`,
      usage,
      budget,
    );
  }
  return usage;
}

/* ────────────────────────── response schema ────────────────────────── */

/**
 * A deliberately tiny, dependency-free subset of JSON Schema — enough to
 * DECLARE the shape of an LLM response and reject anything else. The package
 * carries no validator dependency (only `yaml`), and pulling one in for this
 * would be a heavier contract than the check needs.
 */
export type JsonSchemaNode =
  | {
      readonly type: 'object';
      readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
      readonly required?: readonly string[];
    }
  | { readonly type: 'array'; readonly items?: JsonSchemaNode; readonly minItems?: number }
  | { readonly type: 'string'; readonly enum?: readonly string[]; readonly minLength?: number }
  | { readonly type: 'number' }
  | { readonly type: 'boolean' };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate `value` against `schema`. Returns the list of violations (empty ⇒ valid). */
export function validateJsonSchema(value: unknown, schema: JsonSchemaNode, path = '$'): string[] {
  const errors: string[] = [];
  switch (schema.type) {
    case 'object': {
      if (!isPlainObject(value)) {
        errors.push(`${path} must be an object`);
        break;
      }
      for (const key of schema.required ?? []) {
        if (!(key in value) || value[key] === undefined) errors.push(`${path}.${key} is required`);
      }
      for (const [key, child] of Object.entries(schema.properties ?? {})) {
        if (value[key] === undefined) continue;
        errors.push(...validateJsonSchema(value[key], child, `${path}.${key}`));
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(`${path} must be an array`);
        break;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
      }
      if (schema.items) {
        value.forEach((item, i) => errors.push(...validateJsonSchema(item, schema.items!, `${path}[${i}]`)));
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') {
        errors.push(`${path} must be a string`);
        break;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path} must be at least ${schema.minLength} character(s)`);
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${path} must be one of [${schema.enum.join(', ')}]`);
      }
      break;
    }
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${path} must be a number`);
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') errors.push(`${path} must be a boolean`);
      break;
    }
  }
  return errors;
}

/** The weakest useful contract: the model returned a JSON object, not a scalar or an array. */
export const JSON_OBJECT_SCHEMA: JsonSchemaNode = { type: 'object' };

/**
 * Parse an LLM text response as JSON and validate it against `schema`.
 * Replaces `JSON.parse(x) as T`: a malformed or off-schema answer THROWS.
 */
export function parseAndValidateJson<T>(raw: string, schema: JsonSchemaNode = JSON_OBJECT_SCHEMA): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // The raw body is NOT echoed — it may carry tenant content.
    throw new LlmResponseSchemaError('LLM response is not valid JSON', [message]);
  }
  const errors = validateJsonSchema(parsed, schema);
  if (errors.length > 0) {
    throw new LlmResponseSchemaError('LLM response failed schema validation', errors);
  }
  return parsed as T;
}

/* ────────────────────────────── audit ─────────────────────────────── */

export type LlmEgressOutcome = 'refused' | 'sent' | 'error';

/**
 * One auditable record per egress ATTEMPT — including refusals, so "the call
 * never happened" is itself observable. Carries aggregate telemetry only:
 * no prompt, no response, no tenant payload, ever.
 */
export interface LlmEgressAuditEvent {
  readonly event: 'llm.egress';
  /** `vendor:model`, e.g. `gemini:gemini-2.5-flash`. */
  readonly provider: string;
  /** Absolute endpoint the process would contact (no credentials in it). */
  readonly endpoint: string;
  /** Why the call was made, e.g. `structured-json` / `assistant-invoke`. */
  readonly purpose: string;
  readonly outcome: LlmEgressOutcome;
  /** Machine-readable cause for `refused` / `error`. */
  readonly reason?: string;
  readonly requestBytes: number;
  readonly estTokens: number;
  readonly redactions: number;
  readonly httpStatus?: number;
  readonly durationMs?: number;
  readonly startedAt: string;
  readonly correlationId: string;
  /**
   * Which HITL gate authorized this attempt (GT-575) — the gate id, plus the
   * approver when the adapter reports one. Absent on refusals that never got
   * past the gate. An identity, never content.
   */
  readonly supervisedBy?: string;
}

export interface ILlmEgressAudit {
  record(event: LlmEgressAuditEvent): void;
}

/** Default sink: one structured, greppable line per attempt on stderr-free stdout. */
export const consoleLlmEgressAudit: ILlmEgressAudit = {
  record(event: LlmEgressAuditEvent): void {
    // eslint-disable-next-line no-console
    console.info(`[evolith:llm-egress] ${JSON.stringify(event)}`);
  },
};

/** A sink that discards events (tests, or a host wiring its own metrics). */
export const noopLlmEgressAudit: ILlmEgressAudit = { record: () => undefined };
