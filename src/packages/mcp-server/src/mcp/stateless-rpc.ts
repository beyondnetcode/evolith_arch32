/**
 * GT-582 — the 2026-07-28 (stateless) JSON-RPC path.
 *
 * Everything here is per-request. There is no `initialize`, no
 * `notifications/initialized`, no `Mcp-Session-Id`, and no server-side map of
 * pending work: the protocol version, client identity and client capabilities
 * arrive in `_meta` on every call, and anything that has to survive a round trip
 * is sealed into the MRTR `requestState` the client echoes back.
 *
 * It runs ALONGSIDE the SDK's session-based Streamable HTTP transport rather
 * than replacing it. That is not hedging: `@modelcontextprotocol/sdk` 1.30.0 —
 * the latest published as of 2026-07-31 — still declares
 * `LATEST_PROTOCOL_VERSION = '2025-11-25'` and has no `server/discover`, no
 * `resultType` and no MRTR, so a 2026-07-28 request cannot be served through it
 * and a 2025-11-25 client cannot be served without it.
 *
 * The two paths share ONE dispatch ({@link StatelessRpcOps}), so ABAC, the
 * scope gate, the approval gate and the audit trail are the same code on both.
 */

import {
  JSONRPC_INTERNAL_ERROR,
  JSONRPC_INVALID_PARAMS,
  JSONRPC_INVALID_REQUEST,
  JSONRPC_METHOD_NOT_FOUND,
  MCP_ERROR_MISSING_CLIENT_CAPABILITY,
  MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION,
  META_CLIENT_CAPABILITIES,
  META_PROTOCOL_VERSION,
  META_SERVER_INFO,
  PROTOCOL_REVISION_STATELESS,
  SUPPORTED_PROTOCOL_REVISIONS,
  readRequestMeta,
  type JsonRpcRequestLike,
} from './protocol-revisions';
import {
  DEFAULT_REQUEST_STATE_TTL_MS,
  computeRequestDigest,
  sealRequestState,
  verifyRequestState,
} from './mrtr-request-state';
import { issueGrantForCall } from './approval-grant';
import type { McpUserContext } from './mcp-user-context';
import type { ToolCallResult } from './mcp-tool-dispatch';
import { generateCorrelationId } from '../common/envelopes';

/** The single dispatch both protocol paths share. */
export interface StatelessRpcOps {
  serverInfo: { name: string; version: string };
  capabilities(): Record<string, unknown>;
  /** Natural-language guidance returned by `server/discover`. */
  instructions?: string;
  listTools(): Promise<{ tools: unknown[] }>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
  /** Whether a tool mutates state and therefore must pass the approval gate. */
  isMutative(name: string): boolean;
  listResources?(): Promise<unknown>;
  readResource?(uri: string): Promise<unknown>;
  listPrompts?(): unknown;
  getPrompt?(name: string, args: Record<string, string>): unknown;
}

export interface StatelessRpcResponse {
  /** HTTP status the caller must use; the specification pins several of them. */
  status: number;
  body: Record<string, unknown>;
}

/** The MRTR key under which this server asks for a human approval. */
export const APPROVAL_INPUT_KEY = 'evolith_approval';

const jsonRpcError = (
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id,
  error: { code, message, ...(data !== undefined ? { data } : {}) },
});

const jsonRpcResult = (
  id: string | number | null,
  result: Record<string, unknown>,
  serverInfo: { name: string; version: string },
): Record<string, unknown> => ({
  jsonrpc: '2.0',
  id,
  result: {
    ...result,
    _meta: {
      ...((result._meta as Record<string, unknown> | undefined) ?? {}),
      [META_SERVER_INFO]: serverInfo,
    },
  },
});

/**
 * The elicitation this server sends when a mutative tool is called without an
 * approval. The schema is what the client renders to the human; the answer comes
 * back as an `ElicitResult` under {@link APPROVAL_INPUT_KEY}.
 */
export function buildApprovalElicitation(toolName: string): Record<string, unknown> {
  return {
    method: 'elicitation/create',
    params: {
      mode: 'form',
      message:
        `'${toolName}' changes state. Confirm you approve this operation, and supply the approval token ` +
        'recorded for it. The approval is bound to this exact call and expires shortly.',
      requestedSchema: {
        type: 'object',
        properties: {
          approve: {
            type: 'boolean',
            description: `Approve running '${toolName}'.`,
          },
          approvalToken: {
            type: 'string',
            minLength: 1,
            description: 'Approval token to record in the audit trail for this operation.',
          },
        },
        required: ['approve', 'approvalToken'],
      },
    },
  };
}

/**
 * Serve one stateless JSON-RPC request.
 *
 * `principal` is the identity the HTTP layer already authenticated; nothing in
 * the body can change it, which is what lets the MRTR state be bound to it.
 */
export async function handleStatelessRpc(
  body: unknown,
  principal: McpUserContext,
  ops: StatelessRpcOps,
  options: { now?: number; env?: NodeJS.ProcessEnv; ttlMs?: number } = {},
): Promise<StatelessRpcResponse> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, body: jsonRpcError(null, JSONRPC_INVALID_REQUEST, 'Invalid Request: expected a JSON-RPC object') };
  }

  const request = body as JsonRpcRequestLike;
  const id = (typeof request.id === 'string' || typeof request.id === 'number') ? request.id : null;
  const method = typeof request.method === 'string' ? request.method : '';
  const params = (request.params ?? {}) as Record<string, unknown>;
  const meta = readRequestMeta(body);

  if (!method) {
    return { status: 400, body: jsonRpcError(id, JSONRPC_INVALID_REQUEST, 'Invalid Request: missing method') };
  }

  // `server/discover` is the one method a client may call before it knows what
  // the server speaks — it exists precisely to answer that. Requiring the
  // version fields on it would make version negotiation depend on already having
  // negotiated. Every other method is held to the specification's rule that a
  // request missing a required `_meta` field is malformed (-32602 / HTTP 400).
  if (method !== 'server/discover') {
    if (!meta.protocolVersion) {
      return {
        status: 400,
        body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, `Invalid params: missing required _meta['${META_PROTOCOL_VERSION}']`),
      };
    }
    if (!meta.clientCapabilities) {
      return {
        status: 400,
        body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, `Invalid params: missing required _meta['${META_CLIENT_CAPABILITIES}']`),
      };
    }
    if (!SUPPORTED_PROTOCOL_REVISIONS.includes(meta.protocolVersion)) {
      return {
        status: 400,
        body: jsonRpcError(
          id,
          MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION,
          `Unsupported protocol version: ${meta.protocolVersion}`,
          { supportedVersions: [...SUPPORTED_PROTOCOL_REVISIONS] },
        ),
      };
    }
  }

  try {
    switch (method) {
      case 'server/discover':
        return {
          status: 200,
          body: jsonRpcResult(
            id,
            {
              resultType: 'complete',
              supportedVersions: [...SUPPORTED_PROTOCOL_REVISIONS],
              capabilities: ops.capabilities(),
              ...(ops.instructions ? { instructions: ops.instructions } : {}),
            },
            ops.serverInfo,
          ),
        };

      case 'ping':
        return { status: 200, body: jsonRpcResult(id, { resultType: 'complete' }, ops.serverInfo) };

      case 'tools/list': {
        const listed = await ops.listTools();
        return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...listed }, ops.serverInfo) };
      }

      case 'tools/call':
        return await handleToolsCall(id, params, meta.clientCapabilities ?? {}, principal, ops, options);

      case 'resources/list': {
        if (!ops.listResources) return { status: 200, body: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, 'Resources are not enabled') };
        const listed = await ops.listResources();
        return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...(listed as object) }, ops.serverInfo) };
      }

      case 'resources/read': {
        if (!ops.readResource) return { status: 200, body: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, 'Resources are not enabled') };
        const uri = params.uri;
        if (typeof uri !== 'string') {
          return { status: 400, body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, 'Invalid params: uri is required') };
        }
        const data = await ops.readResource(uri);
        return {
          status: 200,
          body: jsonRpcResult(
            id,
            { resultType: 'complete', contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] },
            ops.serverInfo,
          ),
        };
      }

      case 'prompts/list': {
        if (!ops.listPrompts) return { status: 200, body: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, 'Prompts are not enabled') };
        return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...(ops.listPrompts() as object) }, ops.serverInfo) };
      }

      case 'prompts/get': {
        if (!ops.getPrompt) return { status: 200, body: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, 'Prompts are not enabled') };
        const name = params.name;
        if (typeof name !== 'string') {
          return { status: 400, body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, 'Invalid params: name is required') };
        }
        const prompt = ops.getPrompt(name, (params.arguments ?? {}) as Record<string, string>);
        return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...(prompt as object) }, ops.serverInfo) };
      }

      default:
        return { status: 200, body: jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, `Method not found: ${method}`) };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 200, body: jsonRpcError(id, JSONRPC_INTERNAL_ERROR, `Internal error: ${message}`) };
  }
}

async function handleToolsCall(
  id: string | number | null,
  params: Record<string, unknown>,
  clientCapabilities: Record<string, unknown>,
  principal: McpUserContext,
  ops: StatelessRpcOps,
  options: { now?: number; env?: NodeJS.ProcessEnv; ttlMs?: number },
): Promise<StatelessRpcResponse> {
  const name = params.name;
  if (typeof name !== 'string' || name.length === 0) {
    return { status: 400, body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, 'Invalid params: name is required') };
  }
  const args = { ...((params.arguments ?? {}) as Record<string, unknown>) };
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now();

  // Non-mutative tools need no round trip; run them and answer `complete`.
  if (!ops.isMutative(name)) {
    const result = await ops.callTool(name, args);
    return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...result }, ops.serverInfo) };
  }

  // A caller that already holds an approval passes it inline, exactly as it does
  // on the 2025-11-25 path. MRTR is an ADDITIONAL way to obtain that approval,
  // not a new precondition — forcing a round trip on a caller who has already
  // been approved would break the working seam GT-608 proved end to end.
  // The gate itself still runs inside `callTool`; nothing is waived here.
  //
  // GT-679 — this shortcut was named as a bypass and it is not one, BUT it only
  // stopped being one when the gate grew teeth. Both legs converge on
  // `ops.callTool`, so the grant is verified identically whichever produced it:
  // a bare string that walks through here is now refused downstream with a
  // reason, where before it was accepted for being non-empty. The parity test
  // asserts exactly that, so the two legs cannot drift apart.
  if (args.apply === true && typeof args.approvalToken === 'string' && args.approvalToken.trim() !== '') {
    const result = await ops.callTool(name, args);
    return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...result }, ops.serverInfo) };
  }

  const tenant = (args.tenant as string | undefined) ?? principal.tenant;
  const requestDigest = computeRequestDigest('tools/call', params);
  const expected = { principal: principal.id, tenant, method: 'tools/call', requestDigest };

  const presentedState = params.requestState;
  const inputResponses = (params.inputResponses ?? {}) as Record<string, unknown>;
  const approval = inputResponses[APPROVAL_INPUT_KEY] as
    | { action?: string; content?: Record<string, unknown> }
    | undefined;

  // ── Retry leg: the client is coming back with the human's answer. ──────────
  if (presentedState !== undefined || approval !== undefined) {
    const verification = verifyRequestState(presentedState, expected, { now, env });
    if (!verification.ok) {
      // Attacker-controlled input that failed verification. The specification
      // requires rejecting it; it never degrades into "approved".
      return {
        status: 400,
        body: jsonRpcError(id, JSONRPC_INVALID_PARAMS, `Invalid params: requestState rejected (${verification.reason})`),
      };
    }
    if (!approval || approval.action !== 'accept') {
      return {
        status: 200,
        body: jsonRpcResult(
          id,
          {
            resultType: 'complete',
            isError: true,
            content: [{ type: 'text', text: `Approval for '${name}' was not granted; '${name}' did not run.` }],
            structuredContent: { success: false, error: { code: 'FORBIDDEN', message: `Approval declined for '${name}'.` } },
          },
          ops.serverInfo,
        ),
      };
    }
    const token = approval.content?.approvalToken;
    const approved = approval.content?.approve;
    if (approved === false || typeof token !== 'string' || token.trim() === '') {
      return {
        status: 200,
        body: jsonRpcResult(
          id,
          {
            resultType: 'complete',
            isError: true,
            content: [{ type: 'text', text: `Approval for '${name}' was incomplete; '${name}' did not run.` }],
            structuredContent: {
              success: false,
              error: { code: 'FORBIDDEN', message: `Approval for '${name}' must set approve:true and a non-empty approvalToken.` },
            },
          },
          ops.serverInfo,
        ),
      };
    }
    // GT-679 — THE SERVER MINTS THE GRANT HERE, and this is the whole point.
    //
    // Everything needed has just been proved: `verifyRequestState` established
    // that this is the request that was shown to the human, for this principal
    // and tenant, unexpired and untampered; and the human answered `accept` with
    // `approve: true`. What used to happen next was that the CLIENT'S OWN
    // `approvalToken` string was forwarded to a gate that only checked it was
    // non-empty — so the caller was, in effect, approving itself.
    //
    // The string the human typed is still REQUIRED above (it is their
    // confirmation) but it is no longer the authority: it never leaves this
    // function. The grant that does travel is bound to principal, tenant, tool
    // and a digest of these arguments, expires, and can be redeemed once.
    const approver =
      (approval.content?.approver as string | undefined)?.trim()
      || `elicitation:${principal.id}`;

    // The forwarded arguments are built FIRST, and the grant is minted over them.
    //
    // Minting over the request's own digest looked equivalent and was not: the
    // retry adds `correlationId`, which is not in `NON_BINDING_ARG_KEYS`, so the
    // gate recomputed a different digest and refused every legitimate approval.
    // The HTTP conformance test caught it; the unit test could not, because its
    // `callTool` is a fake that never runs the gate.
    const forwarded = {
      ...args,
      apply: true,
      correlationId: (args.correlationId as string | undefined) ?? verification.payload.correlationId,
    };
    const { token: grantToken } = issueGrantForCall({
      approver,
      principal: principal.id,
      tenant,
      tool: name,
      args: forwarded,
    }, env);

    // The existing approval gate remains the authority — MRTR only carries the
    // decision to it, and the correlation id comes from the sealed state so the
    // two legs land in the audit trail as one operation.
    const result = await ops.callTool(name, { ...forwarded, approvalToken: grantToken });
    return { status: 200, body: jsonRpcResult(id, { resultType: 'complete', ...result }, ops.serverInfo) };
  }

  // ── First leg: ask for the approval. ──────────────────────────────────────
  // A server MUST NOT send an inputRequest the client has not declared support
  // for. Without elicitation there is no way to obtain a human decision, and
  // answering with a bare requestState would let the client retry immediately
  // and walk straight through the gate — so say what is missing instead.
  if (!clientCapabilities.elicitation) {
    return {
      status: 400,
      body: jsonRpcError(
        id,
        MCP_ERROR_MISSING_CLIENT_CAPABILITY,
        `'${name}' changes state and requires a human approval, which needs the 'elicitation' client capability.`,
        { requiredCapabilities: ['elicitation'] },
      ),
    };
  }

  const requestState = sealRequestState(
    {
      principal: principal.id,
      tenant,
      method: 'tools/call',
      requestDigest,
      correlationId: (args.correlationId as string | undefined) ?? generateCorrelationId(),
      expiresAt: now + (options.ttlMs ?? DEFAULT_REQUEST_STATE_TTL_MS),
    },
    env,
  );

  return {
    status: 200,
    body: jsonRpcResult(
      id,
      {
        resultType: 'input_required',
        inputRequests: { [APPROVAL_INPUT_KEY]: buildApprovalElicitation(name) },
        requestState,
      },
      ops.serverInfo,
    ),
  };
}

/** Convenience for callers that only need to know the revision this path serves. */
export const STATELESS_PATH_REVISION = PROTOCOL_REVISION_STATELESS;
