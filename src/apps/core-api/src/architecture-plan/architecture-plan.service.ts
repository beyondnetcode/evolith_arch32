import { Injectable, Inject } from '@nestjs/common';
import { ArchitecturePlan, ArchitecturePlanStatus } from '@evolith/core-domain';

@Injectable()
export class ArchitecturePlanService {
  constructor(
    @Inject('EvaluationPipelinePort')
    private readonly evaluationPipeline: any,
  ) {}

  async evaluatePlan(planData: Partial<ArchitecturePlan>): Promise<ArchitecturePlan> {
    const plan = new ArchitecturePlan(planData);

    // Call OPA Evaluation via the pipeline statelessly
    const result = await this.evaluationPipeline.evaluate('architecture-planning-gate', plan);

    plan.governance.sdlc_mode_suggested = result.sdlc_mode;
    plan.governance.required_approvals = result.required_approvals;
    
    // The engine just suggests the transition, it does not persist it.
    plan.status = ArchitecturePlanStatus.UNDER_REVIEW;
    
    return plan;
  }
}
