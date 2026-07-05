import { Test, TestingModule } from '@nestjs/testing';
import { ArchitecturePlanController } from './architecture-plan.controller';
import { ArchitecturePlanService } from './architecture-plan.service';

import { ArchitecturePlanStatus } from '@beyondnet/evolith-core-domain';

describe('ArchitecturePlanController', () => {
  let controller: ArchitecturePlanController;
  let service: ArchitecturePlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchitecturePlanController],
      providers: [
        {
          provide: ArchitecturePlanService,
          useValue: {
            evaluatePlan: jest.fn().mockResolvedValue({ id: 'test-id', status: ArchitecturePlanStatus.UNDER_REVIEW, governance: { sdlc_mode_suggested: 'tailored' } })
          }
        }
      ],
    }).compile();

    controller = module.get<ArchitecturePlanController>(ArchitecturePlanController);
    service = module.get<ArchitecturePlanService>(ArchitecturePlanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('evaluate', () => {
    it('should evaluate the plan statelessly', async () => {
      const planDraft = { title: 'Test Plan', scope: { technical: 'yes', functional: 'yes' } };
      const result = await controller.evaluate(planDraft);
      
      expect(service.evaluatePlan).toHaveBeenCalledWith(planDraft);
      expect(result.status).toBe(ArchitecturePlanStatus.UNDER_REVIEW);
      expect(result.governance.sdlc_mode_suggested).toBe('tailored');
    });
  });
});
