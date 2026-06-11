import { IMcpToolHandler } from '../mcp-tool.registry';
import { getAgentTools } from './agent';
import { getArchitectureTools } from './architecture';
import { getGateTools } from './gate';
import { getMoscowTools } from './moscow';
import { getSdlcTools } from './sdlc';
import { getValidateTools } from './validate';

export function getAllTools(): IMcpToolHandler[] {
  return [
    ...getAgentTools(),
    ...getArchitectureTools(),
    ...getGateTools(),
    ...getMoscowTools(),
    ...getSdlcTools(),
    ...getValidateTools(),
  ];
}
