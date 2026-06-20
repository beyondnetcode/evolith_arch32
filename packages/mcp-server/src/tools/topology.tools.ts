import * as path from 'node:path';
import type { IFileSystem, ILogger } from '@evolith/core';
import { TopologyCatalogService } from '@evolith/core';
import { McpTool } from '../mcp/tool.interface';

/** Topology tools: query architecture topologies */
export function createTopologyTools(
  fs: IFileSystem,
  logger: ILogger,
): McpTool[] {
  const catalog = new TopologyCatalogService(fs, logger);

  return [
    {
      schema: {
        name: 'evolith-topology-list',
        description: 'List all available architecture topologies in Evolith Core.',
        inputSchema: {
          type: 'object',
          properties: {
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
        },
      },
      execute: async (args) => {
        const corePath = (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
        try {
          const topologies = await catalog.list(corePath);
          return {
            tool: 'evolith-topology-list',
            count: topologies.length,
            topologies,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          return {
            error: true,
            message: `Failed to list topologies: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      schema: {
        name: 'evolith-topology-get',
        description: 'Get a specific architecture topology by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The ID of the topology to retrieve' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['id'],
        },
      },
      execute: async (args) => {
        const id = args.id as string;
        const corePath = (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
        if (!id) return { error: true, message: 'id is required' };

        try {
          const topology = await catalog.get(corePath, id);
          if (!topology) {
            return {
              error: true,
              message: `Topology not found: ${id}`,
            };
          }
          return {
            tool: 'evolith-topology-get',
            id,
            topology,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          return {
            error: true,
            message: `Failed to get topology ${id}: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
  ];
}
