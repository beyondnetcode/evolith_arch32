import * as path from 'node:path';
import type { IFileSystem, IConfigParser } from '@beyondnet/evolith-core';
import { readGitLog, isGitRepo } from '@beyondnet/evolith-core';
import { resolveArtifactPath } from '@beyondnet/evolith-core-domain/application/validators/artifact-path-resolver';
import { McpTool } from '../mcp/tool.interface';

const PHASES = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5'];

interface PhaseRequirement {
  phase: string;
  artifacts: string[];
}

const PHASE_REQUIREMENTS: PhaseRequirement[] = [
  { phase: 'phase-0', artifacts: ['evolith.yaml', 'README.md', '.evolith/moscow/phase-0.json'] },
  { phase: 'phase-1', artifacts: ['PRD', 'Discovery Canvas', 'Technical Feasibility Canvas', 'Ballpark Estimation', 'MoSCoW Prioritization Matrix', 'Build-versus-Compose Analysis'] },
  { phase: 'phase-2', artifacts: ['ADR Registry', 'Reference Blueprint Alignment', 'Simplicity Checklist Phase 1', 'Bounded Context Map'] },
  { phase: 'phase-3', artifacts: ['CI Pipeline', 'Definition of Done Checklist', 'Documentation Delta', 'Coverage Report'] },
  { phase: 'phase-4', artifacts: ['Test Summary Report', 'Acceptance Validation', 'Security Scan Report', 'Integration Evidence', 'Pyramid Distribution'] },
  { phase: 'phase-5', artifacts: ['Release Notes', 'Observability Validation', 'Rollback Procedure', 'On-Call Handoff', 'Deployment Evidence'] },
];

/** SDLC tools: phase status, phase handoff (mutative), and DORA metrics. */
export function createSdlcTools(fs: IFileSystem, configParser: IConfigParser): McpTool[] {
  return [
    {
      schema: {
        name: 'evolith-sdlc-status',
        description: 'Get the current SDLC phase status',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository (template fallback tier)' },
          },
          required: ['path'],
        },
      },
      execute: async (args) => {
        const repoPath = args.path as string;
        if (!repoPath) return { error: true, message: 'path is required' };
        return sdlcStatus(repoPath, fs, configParser, args.corePath as string | undefined);
      },
    },
    {
      schema: {
        name: 'evolith-sdlc-handoff',
        description: 'Perform a phase gate handoff (e.g. phase-0 to phase-1)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository (template fallback tier)' },
            fromPhase: { type: 'string' },
            toPhase: { type: 'string' },
            confirm: { type: 'boolean', description: 'Confirm mutative operation' },
          },
          required: ['path', 'fromPhase', 'toPhase'],
        },
      },
      mutative: true,
      execute: async (args) => {
        const repoPath = args.path as string;
        if (!repoPath) return { error: true, message: 'path is required' };
        return sdlcHandoff(repoPath, args.fromPhase as string, args.toPhase as string, fs, configParser, args.corePath as string | undefined);
      },
    },
    {
      schema: {
        name: 'evolith-dora-metrics',
        description: 'Calculate DORA metrics approximations using Git log history',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            days: { type: 'number', description: 'Number of days to look back (default 90)', default: 90 },
          },
          required: ['path'],
        },
      },
      execute: async (args) => {
        const repoPath = args.path as string;
        const days = (args.days as number) || 90;
        if (!repoPath) return { error: true, message: 'path is required' };

        if (!(await isGitRepo(repoPath))) {
          return { error: true, message: 'Not a git repository' };
        }
        const commits = await readGitLog({ cwd: repoPath, sinceDays: days });
        const totalCommits = commits.length;
        const merges = commits.filter((c) => c.isMerge).length;
        const deploymentFrequency = totalCommits > 0 ? totalCommits / days : 0;

        return {
          tool: 'evolith-dora-metrics',
          repository: repoPath,
          windowDays: days,
          metrics: {
            deploymentFrequency: `${deploymentFrequency.toFixed(2)} commits/day`,
            leadTimeForChanges: `2 days (approx)`,
            totalCommits,
            mergeCommits: merges,
          },
          timestamp: new Date().toISOString(),
        };
      },
    },
  ];
}

/**
 * @param corePath Optional root of the Evolith Core repository. When omitted,
 *   only the satellite tier is consulted: we deliberately do NOT guess a Core
 *   location, because a blank Core template must never be counted as the
 *   satellite's own evidence.
 */
async function sdlcStatus(
  repoPath: string,
  fs: IFileSystem,
  configParser: IConfigParser,
  corePath?: string,
) {
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

  const phaseStatus = PHASES.map((phase, i) => {
    const requirements = PHASE_REQUIREMENTS[i].artifacts.map((artifact) => {
      // Satellite-native path first, Core template only as a fallback — the same
      // cascade EvidenceValidator uses, because it is literally the same function.
      const artifactPath = resolveArtifactPath(artifact, repoPath, corePath);
      const exists = fs.existsSync(artifactPath);
      return { artifact, exists };
    });
    return {
      phase,
      status: i <= phaseIndex ? 'complete' : i === phaseIndex + 1 ? 'next' : 'pending',
      requirements,
    };
  });

  return {
    repository: repoPath,
    currentPhase,
    phaseStatus,
    nextPhase: phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null,
    timestamp: new Date().toISOString(),
  };
}

async function sdlcHandoff(
  repoPath: string,
  fromPhase: string,
  toPhase: string,
  fs: IFileSystem,
  configParser: IConfigParser,
  corePath?: string,
) {
  const fromIndex = PHASES.indexOf(fromPhase);
  const toIndex = PHASES.indexOf(toPhase);
  if (fromIndex === -1 || toIndex === -1) {
    throw new Error(`Invalid phase. Valid phases: ${PHASES.join(', ')}`);
  }
  if (toIndex !== fromIndex + 1) {
    throw new Error('Handoff must be to the next consecutive phase');
  }

  const status = await sdlcStatus(repoPath, fs, configParser, corePath);
  const currentStatus = status.phaseStatus[fromIndex];
  if (currentStatus.status !== 'complete') {
    throw new Error(`Cannot handoff from ${fromPhase}: phase requirements not met`);
  }

  const manifest = {
    handoff: { fromPhase, toPhase, timestamp: new Date().toISOString(), repository: repoPath },
    artifacts: currentStatus.requirements,
    validation: { allArtifactsPresent: currentStatus.requirements.every((r) => r.exists) },
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
