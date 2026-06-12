import * as path from 'path';
import { getFileSystem } from '../tools/tool-utils';
import { IFileSystem } from '../../../core/abstractions';

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

const RESOURCES: Resource[] = [
  { uri: 'evolith://rulesets', name: 'Rulesets', description: 'List of all available rulesets in Evolith Core' },
  { uri: 'evolith://phase-gates', name: 'Phase Gates', description: 'Phase gate definitions and requirements' },
  { uri: 'evolith://agents', name: 'Agents', description: 'List of installed Evolith agents' },
  { uri: 'evolith://governance/version', name: 'Governance Version', description: 'Current governance schema version' },
  { uri: 'evolith://core/version', name: 'Core Version', description: 'Current Core schema version' },
  { uri: 'evolith://repository/config', name: 'Repository Config', description: 'Repository evolith.yaml content' },
  { uri: 'evolith://moscow/phase-0', name: 'MoSCoW Phase 0', description: 'MoSCoW prioritization matrix for discovery phase' },
];

export async function listResources() {
  return { resources: RESOURCES };
}

export async function readResource(args: unknown) {
  const fs = getFileSystem();
  const configParser = require('../../../core/abstractions/providers/config-parser.provider').YamlConfigParserProvider.prototype.createConfigParser('yaml');
  const uri = (args as { uri: string }).uri;

  if (uri === 'evolith://rulesets') {
    return await getRulesetsList(fs);
  } else if (uri === 'evolith://phase-gates') {
    return getPhaseGates();
  } else if (uri === 'evolith://agents') {
    return await getAgentsList(fs);
  } else if (uri === 'evolith://governance/version') {
    return { version: '1.0.0', schema: 'governance' };
  } else if (uri === 'evolith://core/version') {
    return { version: '1.0.0', schema: 'core' };
  } else if (uri.startsWith('evolith://ruleset/')) {
    const rulesetName = uri.replace('evolith://ruleset/', '');
    return await getRulesetContent(rulesetName, fs);
  } else if (uri.startsWith('evolith://agent/')) {
    const agentName = uri.replace('evolith://agent/', '');
    return await getAgentContent(agentName, fs);
  } else if (uri === 'evolith://repository/config') {
    return await getRepositoryConfig(fs, configParser);
  } else if (uri === 'evolith://moscow/phase-0') {
    return await getMoscowwAnalysis(fs, 'phase-0');
  } else if (uri.startsWith('evolith://moscow/')) {
    const phase = uri.replace('evolith://moscow/', '');
    return await getMoscowwAnalysis(fs, phase);
  } else if (uri === 'evolith://open-core/artifacts') {
    return await getOpenCoreArtifacts(fs);
  } else if (uri === 'evolith://acl/rules') {
    return await getAclRules(fs);
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

async function getRulesetsList(fs: IFileSystem) {
  const corePath = findCorePath(process.cwd(), fs);
  const rulesetsPath = path.join(corePath, 'rulesets');

  if (!await fs.exists(rulesetsPath)) {
    return { rulesets: [], error: 'Rulesets directory not found' };
  }

  const entries = await fs.readdir(rulesetsPath);
  const rulesets: Array<{ category: string; name: string; path: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const categoryPath = path.join(rulesetsPath, entry.name);
      const files = await fs.readdirNames(categoryPath);
      const ruleFiles = files.filter(f => f.endsWith('.rules.json'));

      for (const ruleFile of ruleFiles) {
        rulesets.push({
          category: entry.name,
          name: ruleFile.replace('.rules.json', ''),
          path: `rulesets/${entry.name}/${ruleFile}`,
        });
      }
    }
  }

  return { rulesets, count: rulesets.length };
}

async function getRulesetContent(name: string, fs: IFileSystem) {
  const corePath = findCorePath(process.cwd(), fs);
  const normalizedName = name.replace(/-/g, '/');
  const rulesetPath = path.join(corePath, 'rulesets', normalizedName + '.rules.json');

  if (await fs.exists(rulesetPath)) {
    return await fs.readJson(rulesetPath);
  }

  const parts = name.split('/');
  if (parts.length === 2) {
    const altPath = path.join(corePath, 'rulesets', parts[0], parts[1] + '.rules.json');
    if (await fs.exists(altPath)) {
      return await fs.readJson(altPath);
    }
  }

  return { error: `Ruleset not found: ${name}` };
}

function getPhaseGates() {
  return {
    phaseGates: [
      { phase: 'phase-0', name: 'Foundation', requirements: ['evolith.yaml', 'coreRef.version pinned'] },
      { phase: 'phase-1', name: 'Structure', requirements: ['package.json', 'src/ directory', 'bilingual README'] },
      { phase: 'phase-2', name: 'Governance', requirements: ['rulesets/ directory', 'ACL ruleset', '.harness/ scripts'] },
      { phase: 'phase-3', name: 'Architecture', requirements: ['ADR collection', 'ADR matrix updated'] },
      { phase: 'phase-4', name: 'Production', requirements: ['Dockerfile', 'CI/CD pipeline', 'DORA metrics'] },
    ],
  };
}

async function getAgentsList(fs: IFileSystem) {
  const dir = process.cwd();
  const agentsDir = path.join(dir, 'rulesets', 'agents');

  if (!await fs.exists(agentsDir)) {
    return { agents: [] };
  }

  const entries = await fs.readdirNames(agentsDir);
  return { agents: entries, count: entries.length };
}

async function getAgentContent(name: string, fs: IFileSystem) {
  const dir = process.cwd();
  const agentPath = path.join(dir, 'rulesets', 'agents', name, 'agent.rules.json');

  if (await fs.exists(agentPath)) {
    return await fs.readJson(agentPath);
  }

  return { error: `Agent not found: ${name}` };
}

async function getRepositoryConfig(fs: IFileSystem, configParser: { parse(content: string): unknown }) {
  const dir = process.cwd();
  const configPath = path.join(dir, 'evolith.yaml');

  if (await fs.exists(configPath)) {
    const content = await fs.readFile(configPath);
    return configParser.parse(content);
  }

  return { error: 'evolith.yaml not found' };
}

async function getOpenCoreArtifacts(fs: IFileSystem) {
  const corePath = findCorePath(process.cwd(), fs);
  const ocbRulesPath = path.join(corePath, 'rulesets', 'governance', 'open-core-boundary.rules.json');

  if (await fs.exists(ocbRulesPath)) {
    return await fs.readJson(ocbRulesPath);
  }

  return { error: 'Open-Core Boundary rules not found' };
}

async function getAclRules(fs: IFileSystem) {
  const corePath = findCorePath(process.cwd(), fs);
  const aclPath = path.join(corePath, 'rulesets', 'acl', 'anti-corruption-layer.rules.json');

  if (await fs.exists(aclPath)) {
    return await fs.readJson(aclPath);
  }

  return { error: 'ACL rules not found' };
}

async function getMoscowwAnalysis(fs: IFileSystem, phase: string) {
  const dir = process.cwd();
  const moscowPath = path.join(dir, '.evolith', 'moscow', `${phase}.json`);

  if (await fs.exists(moscowPath)) {
    return await fs.readJson(moscowPath);
  }

  return { error: `MoSCoW analysis not found for ${phase}` };
}

function findCorePath(satellitePath: string, fs: IFileSystem): string {
  const parts = satellitePath.split(path.sep);
  while (parts.length > 0) {
    parts.pop();
    const candidate = path.join(parts.join(path.sep), 'rulesets');
    if (fs.existsSync(candidate)) {
      return parts.join(path.sep);
    }
  }
  return path.join(satellitePath, '..', 'evolith');
}