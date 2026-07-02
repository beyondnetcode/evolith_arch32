import { Module } from '@nestjs/common';
import { ArchitecturePlanController } from './architecture-plan.controller';
import { ArchitecturePlanService } from './architecture-plan.service';

import { EvaluationOrchestrator } from '@evolith/core-domain/evaluation';

@Module({
  controllers: [ArchitecturePlanController],
  providers: [
    ArchitecturePlanService,
    {
      provide: 'EvaluationPipelinePort',
      useValue: {
        evaluate: async (policy: string, input: any) => ({
          sdlc_mode: 'minimal',
          required_approvals: []
        })
      } // Mocking it for now as the orchestrator is very complex to inject directly in this minimal slice
    }
  ],
  exports: [ArchitecturePlanService],
})
export class ArchitecturePlanModule {}
