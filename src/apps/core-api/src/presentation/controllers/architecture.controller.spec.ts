import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { ArchitectureController } from './architecture.controller';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { ArchitectureDriftService } from '@beyondnet/evolith-core-domain/application/validators';
import { TopologyCatalogService, TopologyRecommendationService, PhaseArtifactProfileService } from '@beyondnet/evolith-core-domain/application/services';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

describe('ArchitectureController', () => {
  let controller: ArchitectureController;
  let validateUseCase: { execute: jest.Mock };
  let driftService: { detectDrift: jest.Mock };
  let workspaceResolver: { resolve: jest.Mock; corePath: jest.Mock };
  let topologyCatalog: { list: jest.Mock; get: jest.Mock };
  let fileSystem: { readFile: jest.Mock };

  beforeEach(async () => {
    validateUseCase = { execute: jest.fn().mockResolvedValue({ valid: true }) };
    driftService = { detectDrift: jest.fn().mockResolvedValue({ driftDetected: false }) };
    workspaceResolver = { resolve: jest.fn().mockReturnValue('/workspaces/op_01'), corePath: jest.fn().mockReturnValue('/core') } as any;
    topologyCatalog = { list: jest.fn().mockResolvedValue([{ metadata: { id: 'test-topology' } }]), get: jest.fn().mockResolvedValue({ metadata: { id: 'test-topology' } }) };
    fileSystem = { readFile: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [ArchitectureController],
      providers: [
        { provide: ValidateSatelliteUseCase, useValue: validateUseCase },
        { provide: ArchitectureDriftService, useValue: driftService },
        { provide: WorkspaceReferenceResolverService, useValue: workspaceResolver },
        { provide: TopologyCatalogService, useValue: topologyCatalog },
        { provide: TopologyRecommendationService, useValue: new TopologyRecommendationService() },
        { provide: PhaseArtifactProfileService, useValue: new PhaseArtifactProfileService() },
        { provide: 'IFileSystem', useValue: fileSystem },
      ],
    }).compile();
    controller = module.get<ArchitectureController>(ArchitectureController);
  });


  describe('topology discovery', () => {
    it('should list all topologies', async () => {
      const result = await controller.listTopologies();
      expect(topologyCatalog.list).toHaveBeenCalledWith('/core');
      expect(result).toEqual([{ metadata: { id: 'test-topology' } }]);
    });

    it('should get a specific topology', async () => {
      const result = await controller.getTopology('test-topology');
      expect(topologyCatalog.get).toHaveBeenCalledWith('/core', 'test-topology');
      expect(result).toEqual({ metadata: { id: 'test-topology' } });
    });

    it('should throw NotFoundException if topology not found', async () => {
      topologyCatalog.get.mockResolvedValue(undefined);
      await expect(controller.getTopology('unknown')).rejects.toThrow('Topology unknown not found');
    });
  });

  describe('validateSatellite', () => {
    it('should validate a satellite', async () => {
      await controller.validateSatellite({ workspaceRef: 'op_01' });
      expect(validateUseCase.execute).toHaveBeenCalledWith({
        satellitePath: '/workspaces/op_01',
        corePath: '/core',
      });
      expect(workspaceResolver.resolve).toHaveBeenCalledWith('op_01');
    });

    it('should propagate validation errors', async () => {
      validateUseCase.execute.mockRejectedValue(new Error('Invalid satellite'));
      await expect(
        controller.validateSatellite({ workspaceRef: 'op_bad' })
      ).rejects.toThrow('Invalid satellite');
    });
  });

  describe('detectDrift', () => {
    it('should detect drift with project path', async () => {
      await controller.detectDrift({ workspaceRef: 'op_01' });
      expect(driftService.detectDrift).toHaveBeenCalledWith({
        projectPath: '/workspaces/op_01',
        corePath: '/core',
        declaredLevel: undefined,
      });
    });

    it('should propagate drift detection errors', async () => {
      driftService.detectDrift.mockRejectedValue(new Error('Analysis failed'));
      await expect(
        controller.detectDrift({ workspaceRef: 'op_bad' })
      ).rejects.toThrow('Analysis failed');
    });
  });

  describe('recommendTopology (GT-431)', () => {
    const rules = {
      id: 'topology-recommendation',
      version: '1.0.0',
      progressive: [{ id: 'MM', when: {}, recommend: 'modular-monolith', rationale: 'default', priority: 1 }],
      dimensions: [{ id: 'ED', when: { asyncIntegration: true }, recommend: 'event-driven', rationale: 'async' }],
    };

    it('loads the rules from corePath and recommends a composition from signals', async () => {
      fileSystem.readFile.mockResolvedValue(JSON.stringify(rules));
      const r = await controller.recommendTopology({ signals: { asyncIntegration: true } });
      expect(fileSystem.readFile).toHaveBeenCalledWith('/core/src/rulesets/architecture/topology-recommendation.rules.json');
      expect(r.recommended).toEqual(['modular-monolith', 'event-driven']);
      expect(r.composition).toBe('modular-monolith + event-driven');
    });

    it('defaults to modular-monolith when no signals are provided', async () => {
      fileSystem.readFile.mockResolvedValue(JSON.stringify(rules));
      const r = await controller.recommendTopology({});
      expect(r.recommended).toEqual(['modular-monolith']);
    });
  });

  describe('evaluatePhaseArtifacts (GT-434)', () => {
    it('measures downstream artifact completeness from the topology phaseProfiles', async () => {
      topologyCatalog.get.mockResolvedValue({
        metadata: { id: 'serverless' },
        spec: { phaseProfiles: { quality: { conditional: [{ artifactKind: 'performance-validation' }] } } },
      });
      const r = await controller.evaluatePhaseArtifacts({
        phase: 'quality',
        topologies: ['serverless'],
        declaredArtifacts: ['test-summary-report', 'coverage-report', 'performance-validation'],
      });
      expect(topologyCatalog.get).toHaveBeenCalledWith('/core', 'serverless');
      // 7 universal quality + performance-validation = 8 required; 3 present → 38
      expect(r.requiredArtifacts).toContain('performance-validation');
      expect(r.presentArtifacts).toEqual(expect.arrayContaining(['test-summary-report', 'coverage-report', 'performance-validation']));
      expect(r.completeness).toBe(38);
    });
  });
});
