import {
  MoscowPrioritizationService,
  type MoscowItem,
} from '@beyondnet/evolith-infra-providers';
import { McpTool } from '../mcp/tool.interface';

const pathProp = { path: { type: 'string' } };

/** MoSCoW prioritization tools (create/load/update/remove/list/validate/report). */
export function createMoscowTools(service: MoscowPrioritizationService): McpTool[] {
  const phaseOf = (args: Record<string, unknown>) => (args.phase as string) || 'phase-0';
  const repoOf = (args: Record<string, unknown>) => args.path as string;

  return [
    {
      schema: {
        name: 'evolith-moscow-create',
        description: 'Create a new MoSCoW prioritization analysis',
        inputSchema: {
          type: 'object',
          properties: {
            ...pathProp,
            phase: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string', description: 'MUST, SHOULD, COULD, WONT' },
                  effort: { type: 'string', description: 'high, medium, low' },
                  value: { type: 'string', description: 'high, medium, low' },
                },
                required: ['title', 'category'],
              },
            },
          },
          required: ['path', 'items'],
        },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const items = args.items as Array<Omit<MoscowItem, 'id'>>;
        if (!items || items.length === 0) return { error: true, message: 'items array is required' };
        const analysis = await service.createAnalysis(repoPath, phaseOf(args), items);
        return { success: true, analysis, message: `MoSCoW analysis created for ${phaseOf(args)}` };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-load',
        description: 'Load an existing MoSCoW analysis',
        inputSchema: { type: 'object', properties: { ...pathProp, phase: { type: 'string' } }, required: ['path', 'phase'] },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const analysis = await service.loadAnalysis(repoPath, phaseOf(args));
        return analysis ?? { error: true, message: `No MoSCoW analysis found for ${phaseOf(args)}` };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-update',
        description: 'Update a specific item in a MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: { ...pathProp, phase: { type: 'string' }, itemId: { type: 'string' }, updates: { type: 'object' } },
          required: ['path', 'phase', 'itemId', 'updates'],
        },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const itemId = args.itemId as string;
        if (!itemId) return { error: true, message: 'itemId is required' };
        const analysis = await service.updateItem(repoPath, phaseOf(args), itemId, args.updates as Partial<MoscowItem>);
        if (!analysis) return { error: true, message: `Item ${itemId} not found in ${phaseOf(args)}` };
        return { success: true, analysis, message: `Item ${itemId} updated` };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-remove',
        description: 'Remove a specific item from a MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: { ...pathProp, phase: { type: 'string' }, itemId: { type: 'string' } },
          required: ['path', 'phase', 'itemId'],
        },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const itemId = args.itemId as string;
        if (!itemId) return { error: true, message: 'itemId is required' };
        const analysis = await service.removeItem(repoPath, phaseOf(args), itemId);
        if (!analysis) return { error: true, message: `Item ${itemId} not found in ${phaseOf(args)}` };
        return { success: true, analysis, message: `Item ${itemId} removed` };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-list',
        description: 'List all MoSCoW analyses in a repository',
        inputSchema: { type: 'object', properties: { ...pathProp }, required: ['path'] },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const analyses = await service.listAnalyses(repoPath);
        return { analyses: analyses || [], count: analyses ? analyses.length : 0 };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-validate',
        description: 'Validate a MoSCoW analysis rules (e.g. 60/20/20 split)',
        inputSchema: { type: 'object', properties: { ...pathProp, phase: { type: 'string' } }, required: ['path', 'phase'] },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const analysis = await service.loadAnalysis(repoPath, phaseOf(args));
        if (!analysis) return { error: true, message: `No MoSCoW analysis found for ${phaseOf(args)}` };
        const validation = service.validateAnalysis(analysis);
        return { valid: validation.valid, issues: validation.issues, analysis };
      },
    },
    {
      schema: {
        name: 'evolith-moscow-report',
        description: 'Generate a markdown report of a MoSCoW analysis',
        inputSchema: { type: 'object', properties: { ...pathProp, phase: { type: 'string' } }, required: ['path', 'phase'] },
      },
      execute: async (args) => {
        const repoPath = repoOf(args);
        if (!repoPath) return { error: true, message: 'path is required' };
        const analysis = await service.loadAnalysis(repoPath, phaseOf(args));
        if (!analysis) return { error: true, message: `No MoSCoW analysis found for ${phaseOf(args)}` };
        return { report: service.generateReport(analysis), analysis };
      },
    },
  ];
}
