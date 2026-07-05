import * as path from 'node:path';
import type {
  IFileSystem,
  ILogger,
  TopologyRecommendationRules,
  TopologyRecommendationSignals,
  TopologyDesignProfile,
  DownstreamPhase,
} from '@evolith/core';
import { TopologyCatalogService, TopologyRecommendationService, PhaseArtifactProfileService } from '@evolith/core';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@evolith/core-domain';
import { McpTool } from '../mcp/tool.interface';

const DOWNSTREAM_PHASES: readonly DownstreamPhase[] = ['construction', 'quality', 'deployment'];

/** Topology tools: query architecture topologies + advisory recommendation (GT-431 / BR-008) */
export function createTopologyTools(
  fs: IFileSystem,
  logger: ILogger,
): McpTool[] {
  const catalog = new TopologyCatalogService(fs, logger);
  const recommendation = new TopologyRecommendationService();
  const phaseArtifacts = new PhaseArtifactProfileService();

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
    {
      schema: {
        name: 'evolith-topology-recommend',
        description:
          'Recommend a topology composition from technical signals (advisory, ADR-0104 / GT-430). ' +
          'Stateless and non-binding: the Core RECOMMENDS (Discovery), the tenant CONFIRMS (Design). ' +
          'Returns the recommended composition + rationale in the ADR-0073 success envelope. ' +
          'Produces the same result as POST /api/v1/architecture/recommend-topology and `evolith topology recommend`.',
        inputSchema: {
          type: 'object',
          properties: {
            signals: {
              type: 'object',
              description:
                'Technical signals, e.g. { teamCount, deploymentIndependence, highScale, asyncIntegration, ' +
                'dataProductSharing, spikyLoad, latencyTolerant, edgeOrOffline, aiAgents }. Empty defaults to modular-monolith.',
              additionalProperties: { type: ['boolean', 'number'] },
            },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
        },
      },
      execute: async (args) => {
        const corePath = (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
        const signals = (args.signals as TopologyRecommendationSignals) || {};
        const rulesPath = path.join(corePath, 'src', 'rulesets', 'architecture', 'topology-recommendation.rules.json');
        try {
          const rules = JSON.parse(await fs.readFile(rulesPath)) as TopologyRecommendationRules;
          const result = recommendation.recommend(rules, signals);
          const executedAt = new Date().toISOString();
          return createSuccessEnvelope(result, {
            command: 'evolith-topology-recommend',
            executedAt,
            durationMs: 0,
            correlationId: `mcp-topology-recommend-${executedAt}`,
            schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
          });
        } catch (error) {
          return {
            error: true,
            message: `Failed to recommend topology: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      schema: {
        name: 'evolith-phase-artifacts-evaluate',
        description:
          'Measure downstream-phase artifact completeness for a confirmed topology composition ' +
          '(advisory, ADR-0104 / DN-06 / GT-434). Stateless and non-binding: for a downstream phase ' +
          '(construction/quality/deployment) it compares the declared artifacts against the UNION of the ' +
          'universal per-phase artifacts and each topology\'s spec.phaseProfiles. Returns required/present/' +
          'missing artifacts + completeness in the ADR-0073 success envelope. Produces the same result as ' +
          'POST /api/v1/architecture/evaluate-phase-artifacts and `evolith topology phase-artifacts`.',
        inputSchema: {
          type: 'object',
          properties: {
            phase: { type: 'string', enum: ['construction', 'quality', 'deployment'], description: 'Downstream SDLC phase' },
            topologies: { type: 'array', items: { type: 'string' }, description: 'Confirmed topology composition (ids)' },
            declaredArtifacts: { type: 'array', items: { type: 'string' }, description: 'Artifact kinds the consumer declares as present' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['phase', 'topologies'],
        },
      },
      execute: async (args) => {
        const corePath = (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
        const phase = args.phase as DownstreamPhase;
        if (!DOWNSTREAM_PHASES.includes(phase)) {
          return { error: true, message: `phase must be one of: ${DOWNSTREAM_PHASES.join(', ')}` };
        }
        const topologies = (args.topologies as string[]) || [];
        const declaredArtifacts = (args.declaredArtifacts as string[]) || [];
        try {
          // Pre-resolve each topology's phaseProfiles once, then pass a sync accessor.
          const profilesByTopo = new Map<string, Partial<Record<DownstreamPhase, TopologyDesignProfile>> | undefined>();
          for (const topo of new Set(topologies)) {
            profilesByTopo.set(topo, (await catalog.get(corePath, topo))?.spec.phaseProfiles);
          }
          const getPhaseProfile = (topo: string, p: DownstreamPhase): TopologyDesignProfile | undefined =>
            profilesByTopo.get(topo)?.[p];

          const result = phaseArtifacts.evaluate(phase, topologies, declaredArtifacts, getPhaseProfile);
          const executedAt = new Date().toISOString();
          return createSuccessEnvelope(result, {
            command: 'evolith-phase-artifacts-evaluate',
            executedAt,
            durationMs: 0,
            correlationId: `mcp-phase-artifacts-evaluate-${executedAt}`,
            schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
          });
        } catch (error) {
          return {
            error: true,
            message: `Failed to evaluate phase artifacts: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
  ];
}
