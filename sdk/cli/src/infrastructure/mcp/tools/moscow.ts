import { IConfigParser } from '../../../domain/interfaces';
import { IFileSystem } from '../../../domain/interfaces';
import { MoscowPrioritizationService, MoscowItem, MoscowAnalysis } from '../../../infrastructure/adapters/moscow-prioritization.service';

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getMoscowTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-moscow-create',
        description: 'Create a new MoSCoW prioritization analysis',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
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
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowCreate(repoPath, phase, args, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-load',
        description: 'Load an existing MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            phase: { type: 'string' },
          },
          required: ['path', 'phase'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowLoad(repoPath, phase, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-update',
        description: 'Update a specific item in a MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            phase: { type: 'string' },
            itemId: { type: 'string' },
            updates: { type: 'object' },
          },
          required: ['path', 'phase', 'itemId', 'updates'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowUpdate(repoPath, phase, args, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-remove',
        description: 'Remove a specific item from a MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            phase: { type: 'string' },
            itemId: { type: 'string' },
          },
          required: ['path', 'phase', 'itemId'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowRemove(repoPath, phase, args, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-list',
        description: 'List all MoSCoW analyses in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowList(repoPath, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-validate',
        description: 'Validate a MoSCoW analysis rules (e.g. 60/20/20 split)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            phase: { type: 'string' },
          },
          required: ['path', 'phase'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowValidate(repoPath, phase, service);
      }
    },
    {
      schema: {
        name: 'evolith-moscow-report',
        description: 'Generate a markdown report of a MoSCoW analysis',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            phase: { type: 'string' },
          },
          required: ['path', 'phase'],
        },
      },
      execute: async (args, deps) => {
        const repoPath = args.path as string;
        const phase = (args.phase as string) || 'phase-0';
        const service = deps?.moscowService || new MoscowPrioritizationService();
        return moscowReport(repoPath, phase, service);
      }
    }
  ];
}

async function moscowCreate(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscowPrioritizationService) {
  if (!repoPath) {
    return { error: true, message: 'path is required' };
  }

  const items = args.items as Array<Omit<MoscowItem, 'id'>>;

  if (!items || items.length === 0) {
    return { error: true, message: 'items array is required' };
  }

  const analysis = await service.createAnalysis(repoPath, phase, items);

  return {
    success: true,
    analysis,
    message: `MoSCoW analysis created for ${phase}`,
  };
}

async function moscowLoad(repoPath: string, phase: string, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const analysis = await service.loadAnalysis(repoPath, phase);

  if (!analysis) {
    return { error: true, message: `No MoSCoW analysis found for ${phase}` };
  }

  return analysis;
}

async function moscowUpdate(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const itemId = args.itemId as string;
  const updates = args.updates as Partial<MoscowItem>;

  if (!itemId) {
    return { error: true, message: 'itemId is required' };
  }

  const analysis = await service.updateItem(repoPath, phase, itemId, updates);

  if (!analysis) {
    return { error: true, message: `Item ${itemId} not found in ${phase}` };
  }

  return {
    success: true,
    analysis,
    message: `Item ${itemId} updated`,
  };
}

async function moscowRemove(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const itemId = args.itemId as string;

  if (!itemId) {
    return { error: true, message: 'itemId is required' };
  }

  const analysis = await service.removeItem(repoPath, phase, itemId);

  if (!analysis) {
    return { error: true, message: `Item ${itemId} not found in ${phase}` };
  }

  return {
    success: true,
    analysis,
    message: `Item ${itemId} removed`,
  };
}

async function moscowList(repoPath: string, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const analyses = await service.listAnalyses(repoPath);

  return {
    analyses: analyses || [],
    count: analyses ? analyses.length : 0,
  };
}

async function moscowValidate(repoPath: string, phase: string, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const analysis = await service.loadAnalysis(repoPath, phase);

  if (!analysis) {
    return { error: true, message: `No MoSCoW analysis found for ${phase}` };
  }

  const validation = service.validateAnalysis(analysis);

  return {
    valid: validation.valid,
    issues: validation.issues,
    analysis,
  };
}

async function moscowReport(repoPath: string, phase: string, service: MoscowPrioritizationService) {
  if (!repoPath) return { error: true, message: 'path is required' };
  const analysis = await service.loadAnalysis(repoPath, phase);

  if (!analysis) {
    return { error: true, message: `No MoSCoW analysis found for ${phase}` };
  }

  const report = service.generateReport(analysis);

  return {
    report,
    analysis,
  };
}
