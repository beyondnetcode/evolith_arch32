import { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { IMcpToolHandler } from '../mcp-tool.registry';
import { getAgentTools } from './agent';
import { getArchitectureTools } from './architecture';
import { getGateTools } from './gate';
import { getMoscowTools } from './moscow';
import { getSdlcTools } from './sdlc';
import { getValidateTools } from './validate';
import { getPhaseAdvanceTools } from './phase-advance';
import { getAutoFixTools } from './auto-fix';

export function getAllTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    ...getAgentTools(fs, configParser),
    ...getArchitectureTools(fs, configParser),
    ...getGateTools(fs, configParser),
    ...getMoscowTools(fs, configParser),
    ...getSdlcTools(fs, configParser),
    ...getValidateTools(fs, configParser),
    ...getPhaseAdvanceTools(fs, configParser),
    ...getAutoFixTools(fs, configParser),
  ];
}
