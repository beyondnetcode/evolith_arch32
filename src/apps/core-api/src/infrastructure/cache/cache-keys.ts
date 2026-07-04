export const CacheKeys = {
  topology: {
    list: 'topology:list',
    byId: (id: string) => `topology:${id}`,
  },
  opa: {
    result: (inputHash: string) => `opa:result:${inputHash}`,
  },
  gate: {
    status: (gateId: string, projectPath: string) => `gate:${gateId}:${projectPath}`,
  },
  mcp: {
    toolsList: 'mcp:tools:list',
    resourcesList: 'mcp:resources:list',
  },
} as const;

// cache-manager v7 / @nestjs/cache-manager v3 use milliseconds
export const CacheTTL = {
  topology: 300_000,   // 5 min
  opa: 60_000,         // 1 min
  gate: 300_000,       // 5 min
  mcp: 600_000,        // 10 min
} as const;
