import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ArchitecturePlanController } from './architecture-plan.controller';
import { ArchitecturePlanService } from './architecture-plan.service';
import { EvaluateArchitecturePlanDto } from './architecture-plan.dto';

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
      const planDraft: EvaluateArchitecturePlanDto = {
        title: 'Test Plan',
        scope: { technical: 'yes', functional: 'yes' },
      };
      const result = await controller.evaluate(planDraft);

      expect(service.evaluatePlan).toHaveBeenCalledWith(planDraft);
      expect(result.status).toBe(ArchitecturePlanStatus.UNDER_REVIEW);
      expect(result.governance.sdlc_mode_suggested).toBe('tailored');
    });
  });

  describe('EvaluateArchitecturePlanDto validation', () => {
    it('accepts a minimal draft (title + scope)', async () => {
      const dto = plainToInstance(EvaluateArchitecturePlanDto, {
        title: 'Test Plan',
        scope: { technical: 'yes', functional: 'yes' },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects a draft missing the required title', async () => {
      const dto = plainToInstance(EvaluateArchitecturePlanDto, {
        scope: { technical: 'yes', functional: 'yes' },
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('rejects an out-of-enum risk criticality', async () => {
      const dto = plainToInstance(EvaluateArchitecturePlanDto, {
        title: 'Test Plan',
        scope: { technical: 'yes', functional: 'yes' },
        risk_assessment: {
          criticality: 'catastrophic',
          complexity: 'low',
          security_risks: [],
          architectural_risks: [],
        },
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'risk_assessment')).toBe(true);
    });
  });
});
