declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(options: { name: string; version: string });
    setRequestHandler(schema: unknown, handler: (request: unknown) => Promise<unknown>): void;
    connect(transport: unknown): Promise<void>;
  }

  export class StdioServerTransport {
    constructor();
  }

  export const ListToolsRequestSchema: unknown;
  export const CallToolRequestSchema: unknown;
  export const ListResourcesRequestSchema: unknown;
  export const ReadResourceRequestSchema: unknown;
  export const ListPromptsRequestSchema: unknown;
  export const GetPromptRequestSchema: unknown;
}

declare module '@modelcontextprotocol/sdk/server' {
  export { Server, StdioServerTransport } from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/server/stdio' {
  export { StdioServerTransport } from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/types' {
  export const ListToolsRequestSchema: unknown;
  export const CallToolRequestSchema: unknown;
  export const ListResourcesRequestSchema: unknown;
  export const ReadResourceRequestSchema: unknown;
  export const ListPromptsRequestSchema: unknown;
  export const GetPromptRequestSchema: unknown;
}