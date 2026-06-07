import { getFileSystem, getContainer } from './tool-utils';
import { IFileSystem } from '../../abstractions';
import { MoscoPrioritizationService, MoscoItem, MoscoAnalysis } from '../../../domain/services/moscow-prioritization.service';

export async function handleMoscoTools(toolName: string, args: Record<string, unknown>, moscoService?: MoscoPrioritizationService) {
  const fs = getFileSystem();
  const repoPath = args.path as string;
  const phase = (args.phase as string) || 'phase-0';

  if (!repoPath) {
    return { error: true, message: 'path is required' };
  }

  const service = moscoService || new MoscoPrioritizationService();

  switch (toolName) {
    case 'evolith-moscow-create':
      return moscowCreate(repoPath, phase, args, moscoService);
    case 'evolith-moscow-load':
      return moscowLoad(repoPath, phase, moscoService);
    case 'evolith-moscow-update':
      return moscowUpdate(repoPath, phase, args, moscoService);
    case 'evolith-moscow-remove':
      return moscowRemove(repoPath, phase, args, moscoService);
    case 'evolith-moscow-list':
      return moscowList(repoPath, moscoService);
    case 'evolith-moscow-validate':
      return moscowValidate(repoPath, phase, moscoService);
    case 'evolith-moscow-report':
      return moscowReport(repoPath, phase, moscoService);
    default:
      throw new Error(`Unknown MoSCoW tool: ${toolName}`);
  }
}

async function moscowCreate(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscoPrioritizationService) {
  const items = args.items as Array<Omit<MoscoItem, 'id'>>;

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

async function moscowLoad(repoPath: string, phase: string, service: MoscoPrioritizationService) {
  const analysis = await service.loadAnalysis(repoPath, phase);

  if (!analysis) {
    return { error: true, message: `No MoSCoW analysis found for ${phase}` };
  }

  return analysis;
}

async function moscowUpdate(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscoPrioritizationService) {
  const itemId = args.itemId as string;
  const updates = args.updates as Partial<MoscoItem>;

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

async function moscowRemove(repoPath: string, phase: string, args: Record<string, unknown>, service: MoscoPrioritizationService) {
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

async function moscowList(repoPath: string, service: MoscoPrioritizationService) {
  const analyses = await service.listAnalyses(repoPath);

  return {
    analyses,
    count: analyses.length,
  };
}

async function moscowValidate(repoPath: string, phase: string, service: MoscoPrioritizationService) {
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

async function moscowReport(repoPath: string, phase: string, service: MoscoPrioritizationService) {
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
