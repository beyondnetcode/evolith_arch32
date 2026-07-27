/**
 * Pre-built user contexts for MCP authentication.
 * Single responsibility: context constants.
 */

import type { McpUserContext } from './mcp-user-context';

export const ADMIN_CONTEXT: McpUserContext = Object.freeze({
  id: 'admin-api-key',
  role: 'admin',
  roles: ['admin'],
  tenant: 'default',
  environment: process.env.NODE_ENV || 'development',
  scopes: ['read', 'write', 'admin'],
}) as McpUserContext;

/** Read-only context for dev bypass — never grant admin in allowNoAuth mode (H3). */
export const READER_CONTEXT: McpUserContext = Object.freeze({
  id: 'dev-allow-no-auth',
  role: 'reader',
  roles: ['reader'],
  tenant: 'default',
  environment: process.env.NODE_ENV || 'development',
  scopes: ['read'],
}) as McpUserContext;

/** Stable identity of the stdio local session (audit trail + tests). */
export const LOCAL_SESSION_ID = 'local-stdio-session';

/** Clearly named role of the stdio local session. */
export const LOCAL_SESSION_ROLE = 'local-session';

/**
 * GT-572 — principal for the **stdio** transport.
 *
 * stdio is a same-process, single-user, non-networked transport: the peer on the
 * other end of stdin/stdout is the OS user who spawned the process, and that user
 * already holds every privilege the tools could exercise (they own the working
 * tree those tools read and write). Until this context existed the stdio path
 * established NO principal at all, so dispatch fell back to the anonymous
 * `roles: []` shape and native ABAC denied EVERY tool with ABAC-02 ("No roles
 * present on user context") — the server announced its tools and executed none.
 *
 * This is deliberately NOT an authorization bypass:
 *
 *  - It is bound to the stdio transport. The HTTP path is untouched and stays
 *    fail-closed: no credential → 401, before any context is established.
 *  - ABAC (native + OPA) still runs on EVERY tools/call with this identity as its
 *    input. The principal declares the pre-existing `operator` role, so no ABAC
 *    rule, role set or rego policy had to be widened to accommodate it —
 *    deploy-class tools stay denied in production (they require `architect`).
 *  - Every mutative tool still requires the HITL `{ apply, approvalToken }` gate.
 *  - The identity is explicit and auditable: `local-stdio-session` /
 *    `local-session` is recorded in the audit trail of every stdio call, so a
 *    locally-originated call is never confused with an authenticated remote one.
 *
 * `environment` is read at call time (not at module load) so ABAC's
 * production-specific rules apply to a stdio process started with
 * `NODE_ENV=production`.
 *
 * GT-572 (second pass): the grant is implicit ONLY outside production. Under
 * `NODE_ENV=production` `McpServerService.start()` consults
 * `evaluateStdioCredentialPolicy` first and refuses to boot unless
 * `EVOLITH_API_KEY` / `--api-key` is configured, so reaching this function in
 * production means a credential was presented at startup.
 */
export function createLocalSessionContext(): McpUserContext {
  return {
    id: LOCAL_SESSION_ID,
    role: LOCAL_SESSION_ROLE,
    // `local-session` is the human/audit-facing role; `operator` is the existing
    // ABAC role whose capability set matches "the user who launched the process".
    roles: [LOCAL_SESSION_ROLE, 'operator'],
    tenant: 'default',
    environment: process.env.NODE_ENV || 'development',
    // No tool declares an `admin` scope; read + write covers the whole surface
    // without granting an administrative scope the transport cannot justify.
    scopes: ['read', 'write'],
  };
}
