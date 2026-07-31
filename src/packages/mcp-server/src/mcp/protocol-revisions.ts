/**
 * GT-582 — MCP protocol revisions, and the per-request metadata the stateless
 * revision replaced the handshake with.
 *
 * VERIFIED AGAINST THE LIVE SPECIFICATION ON 2026-07-31.
 *
 * `2026-07-28` is the **current** revision (the specification's own versioning
 * page names it as current; it is no longer a draft). It is a breaking change:
 *
 *  - protocol-level sessions and the `Mcp-Session-Id` header are gone (SEP-2567);
 *  - the `initialize` / `notifications/initialized` handshake is gone — every
 *    request declares its own protocol version, client info and client
 *    capabilities in `_meta` (SEP-2575);
 *  - `server/discover` is a mandatory server RPC (SEP-2575);
 *  - server-initiated requests are replaced by MRTR: `InputRequiredResult`,
 *    a mandatory `resultType` on every result, and `inputResponses` echoed on a
 *    retry of the original request (SEP-2322).
 *
 * The `@modelcontextprotocol/sdk` in use (1.29.0 — and 1.30.0, the latest
 * published as of 2026-07-31) still declares `LATEST_PROTOCOL_VERSION =
 * '2025-11-25'` and knows nothing of `server/discover`, `resultType` or MRTR.
 * So the 2026-07-28 path CANNOT run through the SDK's `Server`/transport, and
 * this module plus {@link statelessRpc} implement it directly on the HTTP
 * surface, alongside — never instead of — the SDK's session-based path for
 * `2025-11-25` clients.
 */

/** The current protocol revision: stateless, per-request `_meta`, MRTR. */
export const PROTOCOL_REVISION_STATELESS = '2026-07-28';

/** The last handshake-based revision — what the bundled SDK speaks. */
export const PROTOCOL_REVISION_HANDSHAKE = '2025-11-25';

/**
 * Revisions this server answers, newest first. Reported verbatim as
 * `supportedVersions` by `server/discover`.
 */
export const SUPPORTED_PROTOCOL_REVISIONS: readonly string[] = [
  PROTOCOL_REVISION_STATELESS,
  PROTOCOL_REVISION_HANDSHAKE,
  '2025-06-18',
  '2025-03-26',
];

/** Reserved `_meta` keys defined by the specification. */
export const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
export const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';
export const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
export const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

/** JSON-RPC error codes the 2026-07-28 revision allocates in `-32020..-32099`. */
export const MCP_ERROR_HEADER_MISMATCH = -32020;
export const MCP_ERROR_MISSING_CLIENT_CAPABILITY = -32021;
export const MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION = -32022;

/** Standard JSON-RPC codes used by the stateless path. */
export const JSONRPC_INVALID_REQUEST = -32600;
export const JSONRPC_METHOD_NOT_FOUND = -32601;
export const JSONRPC_INVALID_PARAMS = -32602;
export const JSONRPC_INTERNAL_ERROR = -32603;

/** The mandatory discriminator on every result. */
export type ResultType = 'complete' | 'input_required';

export interface JsonRpcRequestLike {
  jsonrpc?: unknown;
  id?: string | number | null;
  method?: unknown;
  params?: Record<string, unknown>;
}

/** The per-request protocol metadata that replaced the handshake. */
export interface RequestProtocolMeta {
  protocolVersion?: string;
  clientInfo?: { name?: string; version?: string };
  clientCapabilities?: Record<string, unknown>;
}

/** Read `params._meta` without assuming any of it is present or well typed. */
export function readRequestMeta(body: unknown): RequestProtocolMeta {
  const params = (body as JsonRpcRequestLike | undefined)?.params;
  const meta = (params?._meta ?? undefined) as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') return {};
  const protocolVersion = meta[META_PROTOCOL_VERSION];
  const clientInfo = meta[META_CLIENT_INFO];
  const clientCapabilities = meta[META_CLIENT_CAPABILITIES];
  return {
    protocolVersion: typeof protocolVersion === 'string' ? protocolVersion : undefined,
    clientInfo: clientInfo && typeof clientInfo === 'object' ? (clientInfo as { name?: string; version?: string }) : undefined,
    clientCapabilities:
      clientCapabilities && typeof clientCapabilities === 'object'
        ? (clientCapabilities as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Whether a request body belongs on the stateless (2026-07-28) path.
 *
 * Deliberately narrow: it routes ONLY what unambiguously announces the new
 * revision, so nothing a `2025-11-25` client sends can be diverted away from
 * the SDK transport that serves it today. `server/discover` qualifies on its
 * own — it is the method a client calls precisely because it does not yet know
 * what the server speaks, and it does not exist in any earlier revision.
 */
export function isStatelessRevisionRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const method = (body as JsonRpcRequestLike).method;
  if (method === 'server/discover') return true;
  return readRequestMeta(body).protocolVersion === PROTOCOL_REVISION_STATELESS;
}
