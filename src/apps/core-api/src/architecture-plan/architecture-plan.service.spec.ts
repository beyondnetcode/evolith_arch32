import { Test, TestingModule } from '@nestjs/testing';
import { ArchitecturePlanService } from './architecture-plan.service';

import { ArchitecturePlanStatus } from '@beyondnet/evolith-core-domain';

describe('ArchitecturePlanService', () => {
  let service: ArchitecturePlanService;
  let pipelinePort: any;

  beforeEach(async () => {
    pipelinePort = {
      evaluate: jest.fn().mockResolvedValue({
        sdlc_mode: 'full',
        required_approvals: ['architecture_lead', 'security_officer']
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchitecturePlanService,
        {
          provide: 'EvaluationPipelinePort',
          useValue: pipelinePort
        }
      ],
    }).compile();

    service = module.get<ArchitecturePlanService>(ArchitecturePlanService);
  });

  it('should evaluate and return the updated plan', async () => {
    const input = {
      title: 'Test',
      scope: { technical: 'test', functional: 'test' },
      impact: { components: [], interfaces: [] },
      risk_assessment: { criticality: 'high', complexity: 'high', security_risks: [], architectural_risks: [] }
    };

    const result = await service.evaluatePlan(input as any);

    expect(pipelinePort.evaluate).toHaveBeenCalledWith('architecture-planning-gate', expect.objectContaining({ title: 'Test' }));
    expect(result.governance.sdlc_mode_suggested).toBe('full');
    expect(result.governance.required_approvals).toContain('security_officer');
    expect(result.status).toBe(ArchitecturePlanStatus.UNDER_REVIEW);
  });
});
