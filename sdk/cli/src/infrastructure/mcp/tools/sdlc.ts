import * as path from 'path';
import { IFileSystem, IConfigParser } from '../../../domain/interfaces';

const PHASES = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4'];

interface PhaseRequirement {
  phase: string;
  artifacts: string[];
  checks: Array<{ id: string; description: string; required: boolean }>;
}

const PHASE_REQUIREMENTS: PhaseRequirement[] = [
  {
    phase: 'phase-0',
    artifacts: ['evolith.yaml', 'README.md', '.evolith/moscow/phase-0.json'],
    checks: [
      { id: 'PG0-01', description: 'evolith.yaml exists and is valid', required: true },
      { id: 'PG0-02', description: 'Core ref version pinned', required: true },
      { id: 'PG0-03', description: 'MoSCoW prioritization matrix created for discovery phase', required: true },
    ],
  },
  {
    phase: 'phase-1',
    artifacts: ['package.json', 'src/'],
    checks: [
      { id: 'PG1-01', description: 'package.json exists with name and version', required: true },
      { id: 'PG1-02', description: 'Source directory exists', required: true },
      { id: 'PG1-03', description: 'Bilingual README exists', required: false },
    ],
  },
  {
    phase: 'phase-2',
    artifacts: ['rulesets/', '.harness/'],
    checks: [
      { id: 'PG2-01', description: 'Rulesets directory exists with ACL', required: true },
      { id: 'PG2-02', description: 'Harness scripts directory exists', required: true },
    ],
  },
  {
    phase: 'phase-3',
    artifacts: ['ADR collection'],
    checks: [
      { id: 'PG3-01', description: 'At least one ADR created', required: true },
      { id: 'PG3-02', description: 'ADR matrix updated', required: true },
    ],
  },
  {
    phase: 'phase-4',
    artifacts: ['Dockerfile', 'CI/CD pipeline'],
    checks: [
      { id: 'PG4-01', description: 'Dockerfile exists', required: true },
      { id: 'PG4-02', description: 'CI/CD pipeline configured', required: true },
      { id: 'PG4-03', description: 'DORA metrics instrumentation', required: false },
    ],
  },
];

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getSdlcTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-sdlc-status',
        description: 'Get the current SDLC phase status',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        /* configParser injected */
        const repoPath = args.path as string;
        if (!repoPath) return { error: true, message: 'path is required' };
        return sdlcStatus(repoPath, fs, configParser);
      }
    },
    {
      schema: {
        name: 'evolith-sdlc-handoff',
        description: 'Perform a phase gate handoff (e.g. phase-0 to phase-1)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            fromPhase: { type: 'string' },
            toPhase: { type: 'string' },
          },
          required: ['path', 'fromPhase', 'toPhase'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        /* configParser injected */
        const repoPath = args.path as string;
        if (!repoPath) return { error: true, message: 'path is required' };
        const fromPhase = args.fromPhase as string;
        const toPhase = args.toPhase as string;
        return sdlcHandoff(repoPath, fromPhase, toPhase, fs, configParser);
      }
    }
  ];
}

async function sdlcStatus(repoPath: string, fs: IFileSystem, configParser: IConfigParser) {
  const evolithYamlPath = path.join(repoPath, 'evolith.yaml');
  let currentPhase = 'phase-0';
  let phaseIndex = 0;

  if (await fs.exists(evolithYamlPath)) {
    const content = await fs.readFile(evolithYamlPath);
    const config = configParser.parse(content) as { product?: { phase?: string } };
    currentPhase = config.product?.phase || 'phase-0';
    phaseIndex = PHASES.indexOf(currentPhase);
    if (phaseIndex === -1) phaseIndex = 0;
  }

  const phaseStatus: Array<{ phase: string; status: string; requirements: Array<{ artifact: string; exists: boolean }> }> = [];

  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    const reqs = PHASE_REQUIREMENTS[i];

    const requirements = reqs.artifacts.map(artifact => {
      let exists = false;
      if (artifact === 'ADR collection') {
        exists = fs.existsSync(path.join(repoPath, 'reference', 'architecture', 'adrs'));
      } else if (artifact.includes('/')) {
        exists = fs.existsSync(path.join(repoPath, artifact));
      } else if (artifact.endsWith('/')) {
        exists = fs.existsSync(path.join(repoPath, artifact));
      } else {
        exists = fs.existsSync(path.join(repoPath, artifact));
      }
      return { artifact, exists };
    });

    phaseStatus.push({
      phase,
      status: i <= phaseIndex ? 'complete' : i === phaseIndex + 1 ? 'next' : 'pending',
      requirements,
    });
  }

  return {
    repository: repoPath,
    currentPhase,
    phaseStatus,
    nextPhase: phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null,
    timestamp: new Date().toISOString(),
  };
}

async function sdlcHandoff(repoPath: string, fromPhase: string, toPhase: string, fs: IFileSystem, configParser: IConfigParser) {
  const fromIndex = PHASES.indexOf(fromPhase);
  const toIndex = PHASES.indexOf(toPhase);

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error(`Invalid phase. Valid phases: ${PHASES.join(', ')}`);
  }

  if (toIndex !== fromIndex + 1) {
    throw new Error('Handoff must be to the next consecutive phase');
  }

  const status = await sdlcStatus(repoPath, fs, configParser);
  const currentStatus = status.phaseStatus[fromIndex];

  if (currentStatus.status !== 'complete') {
    throw new Error(`Cannot handoff from ${fromPhase}: phase requirements not met`);
  }

  const manifest = {
    handoff: {
      fromPhase,
      toPhase,
      timestamp: new Date().toISOString(),
      repository: repoPath,
    },
    artifacts: currentStatus.requirements,
    validation: {
      allArtifactsPresent: currentStatus.requirements.every(r => r.exists),
    },
    recommendations: generateRecommendations(fromPhase),
  };

  const manifestPath = path.join(repoPath, '.evolith', 'handoff-manifest.json');
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeJson(manifestPath, manifest);

  return manifest;
}

function generateRecommendations(fromPhase: string): string[] {
  const recommendations: Record<string, string[]> = {
    'phase-0': ['Ensure coreRef.version is pinned to a stable release', 'Verify governance.version is set'],
    'phase-1': ['Add bilingual documentation before advancing', 'Ensure all dependencies are locked'],
    'phase-2': ['Run validate command to check ACL compliance', 'Verify all rulesets are properly structured'],
    'phase-3': ['Review ADRs for architectural decisions', 'Update ADR matrix with new decisions'],
    'phase-4': ['Run final integration tests', 'Verify DORA metrics are being collected'],
  };
  return recommendations[fromPhase] || [];
}