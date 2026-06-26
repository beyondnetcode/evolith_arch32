declare module "@evolith/mcp-server" {
  export interface StartMcpServerOptions {
    transport?: "stdio" | "http";
    port?: number;
    apiKey?: string;
  }

  export function startMcpServer(options?: StartMcpServerOptions): Promise<unknown>;
}
