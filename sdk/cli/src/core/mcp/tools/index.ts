import { IFileSystem, IConfigParser } from '../../abstractions';
import { IMcpToolHandler } from '../mcp-tool.registry';
import { getAgentTools } from './agent';
import { getArchitectureTools } from './architecture';
import { getGateTools } from './gate';
import { getMoscowTools } from './moscow';
import { getSdlcTools } from './sdlc';
import { getValidateTools } from './validate';

export function getAllTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    ...getAgentTools(fs, configParser),
    ...getArchitectureTools(fs, configParser),
    ...getGateTools(fs, configParser),
    ...getMoscowTools(fs, configParser),
    ...getSdlcTools(fs, configParser),
    ...getValidateTools(fs, configParser),
  ];
}
