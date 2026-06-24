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

export const CacheTTL = {
  topology: 300,
  opa: 60,
  gate: 300,
  mcp: 600,
} as const;
