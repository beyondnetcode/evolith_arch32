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
