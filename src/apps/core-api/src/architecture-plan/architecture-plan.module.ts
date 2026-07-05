import { Module } from '@nestjs/common';
import { ArchitecturePlanController } from './architecture-plan.controller';
import { ArchitecturePlanService } from './architecture-plan.service';

import { EvaluationOrchestrator } from '@beyondnet/evolith-core-domain/evaluation';

import { ArchitecturePlanOpaEvaluator } from './ArchitecturePlanOpaEvaluator';

@Module({
  controllers: [ArchitecturePlanController],
  providers: [
    ArchitecturePlanService,
    ArchitecturePlanOpaEvaluator,
    {
      provide: 'EvaluationPipelinePort',
      useExisting: ArchitecturePlanOpaEvaluator
    }
  ],
  exports: [ArchitecturePlanService],
})
export class ArchitecturePlanModule {}
