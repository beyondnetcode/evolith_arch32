/**
 * Pinned OpenTelemetry semantic-convention vocabulary (GT-587).
 *
 * ## Why a pin, and why here
 *
 * Evolith already emits telemetry — `evolith_*` Prometheus series (GT-546) and
 * `evolith.*` span attributes — but every one of those names is PRIVATE. A private
 * name joins with nothing a customer already collects, and telemetry is not
 * backfillable: a run recorded under `evolith.tenant` yesterday cannot be re-emitted
 * as `gen_ai.*` today. So the vocabulary is the thing worth fixing early, and the
 * fix is ADDITIVE — the semconv names are emitted ALONGSIDE the `evolith.*` ones,
 * never instead of them, because the existing names are already being scraped.
 *
 * The OpenTelemetry GenAI semantic conventions registry is still **Development**
 * status: attribute names in it may be renamed or removed between releases. Emitting
 * against a moving registry without recording WHICH revision was emitted produces
 * exactly the problem this file exists to avoid — a second private vocabulary, one
 * that merely looks standard. Hence {@link SEMCONV_VERSION}: the emitted names are
 * the names of one stated revision, and `.harness/scripts/ci/51-validate-semconv-pin.mjs`
 * fails when the repository's resolved `@opentelemetry/semantic-conventions` moves
 * off it or when any pinned literal stops matching its upstream constant.
 *
 * ## Why literals rather than importing the package
 *
 * `core-domain` is the pure Core. Rule HXA-05 — which this repository enforces on
 * the workspaces it evaluates — flags an observability SDK imported into the domain
 * or application layer, and `opentelemetry-tracker-adapter.ts` already duck-types the
 * tracer interface for the same reason. This module therefore has NO imports at all:
 * it is a vocabulary, not a client. The adapters that actually own a span
 * (`core-api`, `mcp-server`) import these constants from here, so there is exactly
 * one place that states which revision Evolith speaks.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/
 */

/**
 * The `@opentelemetry/semantic-conventions` revision every literal below is taken
 * from. Bumping this WITHOUT re-verifying the literals is the failure mode the drift
 * check exists to catch — the check compares this against the version resolved in
 * `package-lock.json` and compares each literal against the package's own export.
 */
export const SEMCONV_VERSION = '1.41.1';

/**
 * Event name for a single evaluation outcome. Upstream export:
 * `EVENT_GEN_AI_EVALUATION_RESULT`.
 */
export const EVENT_GEN_AI_EVALUATION_RESULT = 'gen_ai.evaluation.result';

/** Name of the evaluator that produced the result. Upstream: `ATTR_GEN_AI_EVALUATION_NAME`. */
export const ATTR_GEN_AI_EVALUATION_NAME = 'gen_ai.evaluation.name';

/** Numeric score, when the evaluator produces one. Upstream: `ATTR_GEN_AI_EVALUATION_SCORE_VALUE`. */
export const ATTR_GEN_AI_EVALUATION_SCORE_VALUE = 'gen_ai.evaluation.score.value';

/** Categorical outcome (here: the canonical `Verdict`). Upstream: `ATTR_GEN_AI_EVALUATION_SCORE_LABEL`. */
export const ATTR_GEN_AI_EVALUATION_SCORE_LABEL = 'gen_ai.evaluation.score.label';

/** Free-text rationale for the score. Upstream: `ATTR_GEN_AI_EVALUATION_EXPLANATION`. */
export const ATTR_GEN_AI_EVALUATION_EXPLANATION = 'gen_ai.evaluation.explanation';

/** MCP JSON-RPC method the span covers. Upstream: `ATTR_MCP_METHOD_NAME`. */
export const ATTR_MCP_METHOD_NAME = 'mcp.method.name';

/** MCP session identifier, when the transport has one. Upstream: `ATTR_MCP_SESSION_ID`. */
export const ATTR_MCP_SESSION_ID = 'mcp.session.id';

/** Negotiated MCP protocol revision. Upstream: `ATTR_MCP_PROTOCOL_VERSION`. */
export const ATTR_MCP_PROTOCOL_VERSION = 'mcp.protocol.version';

/** `tools/call` method value. Upstream: `MCP_METHOD_NAME_VALUE_TOOLS_CALL`. */
export const MCP_METHOD_NAME_VALUE_TOOLS_CALL = 'tools/call';

/**
 * Tool name on a `tools/call` span. The MCP semconv registry defines
 * `mcp.tool.name`, but `@opentelemetry/semantic-conventions@1.41.1` does not yet
 * export a constant for it — see {@link PINNED_SEMCONV_ATTRIBUTES}, where it is
 * declared `registry-only` so the drift check watches for the day it appears
 * upstream under a different spelling instead of silently disagreeing with it.
 */
export const ATTR_MCP_TOOL_NAME = 'mcp.tool.name';

/**
 * How a pinned literal relates to the installed `@opentelemetry/semantic-conventions`.
 *
 * - `exported`      — the package exports `exportName`; its value MUST equal `value`.
 *   The drift check fails if the export vanishes or its value changes.
 * - `registry-only` — the convention exists in the upstream registry but the package
 *   does not export it at {@link SEMCONV_VERSION}. The drift check fails if it LATER
 *   appears with a different value, which is precisely the moment a locally-declared
 *   literal would otherwise start lying.
 */
export type SemconvUpstreamStatus = 'exported' | 'registry-only';

export interface PinnedSemconvSymbol {
  /** The constant's name in `@opentelemetry/semantic-conventions`. */
  readonly exportName: string;
  /** The wire name Evolith emits. */
  readonly value: string;
  readonly upstream: SemconvUpstreamStatus;
}

/**
 * The manifest the drift check reads. Every literal above appears here exactly once;
 * a constant added without a manifest entry is invisible to the check, so the check
 * also asserts that this list covers every `ATTR_`/`EVENT_`/`MCP_…_VALUE_` export of
 * this module.
 */
export const PINNED_SEMCONV_ATTRIBUTES: readonly PinnedSemconvSymbol[] = [
  { exportName: 'EVENT_GEN_AI_EVALUATION_RESULT', value: EVENT_GEN_AI_EVALUATION_RESULT, upstream: 'exported' },
  { exportName: 'ATTR_GEN_AI_EVALUATION_NAME', value: ATTR_GEN_AI_EVALUATION_NAME, upstream: 'exported' },
  { exportName: 'ATTR_GEN_AI_EVALUATION_SCORE_VALUE', value: ATTR_GEN_AI_EVALUATION_SCORE_VALUE, upstream: 'exported' },
  { exportName: 'ATTR_GEN_AI_EVALUATION_SCORE_LABEL', value: ATTR_GEN_AI_EVALUATION_SCORE_LABEL, upstream: 'exported' },
  { exportName: 'ATTR_GEN_AI_EVALUATION_EXPLANATION', value: ATTR_GEN_AI_EVALUATION_EXPLANATION, upstream: 'exported' },
  { exportName: 'ATTR_MCP_METHOD_NAME', value: ATTR_MCP_METHOD_NAME, upstream: 'exported' },
  { exportName: 'ATTR_MCP_SESSION_ID', value: ATTR_MCP_SESSION_ID, upstream: 'exported' },
  { exportName: 'ATTR_MCP_PROTOCOL_VERSION', value: ATTR_MCP_PROTOCOL_VERSION, upstream: 'exported' },
  { exportName: 'MCP_METHOD_NAME_VALUE_TOOLS_CALL', value: MCP_METHOD_NAME_VALUE_TOOLS_CALL, upstream: 'exported' },
  { exportName: 'ATTR_MCP_TOOL_NAME', value: ATTR_MCP_TOOL_NAME, upstream: 'registry-only' },
];
