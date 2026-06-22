import { AsyncLocalStorage } from 'node:async_hooks';

export interface McpUserContext {
  id: string;
  role: string;
  roles: string[];
  tenant: string;
  environment: string;
  scopes: string[];
}

export const mcpContextStorage = new AsyncLocalStorage<McpUserContext>();
