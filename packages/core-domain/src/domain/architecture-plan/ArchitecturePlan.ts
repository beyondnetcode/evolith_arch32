import { ArchitecturePlanStatus } from './ArchitecturePlanStatus.enum';

export interface ArchitecturePlanScope {
  functional: string;
  technical: string;
}

export interface ArchitecturePlanImpact {
  components: string[];
  interfaces: string[];
}

export interface ArchitecturePlanRiskAssessment {
  criticality: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
  security_risks: string[];
  architectural_risks: string[];
}

export interface ArchitecturePlanGovernance {
  sdlc_mode_suggested?: 'full' | 'tailored' | 'minimal' | 'rejected';
  justification?: string;
  required_approvals?: string[];
}

export interface ArchitecturePlanExecutionPlan {
  suggested_sdlc_phases: string[];
  mandatory_gates: string[];
  suggested_adrs: string[];
  applicable_policies: string[];
}

export interface ArchitecturePlanComment {
  author: string;
  text: string;
  timestamp: string;
}

export interface ArchitecturePlanAuditTrail {
  created_by: string;
  created_at: string;
  comments: ArchitecturePlanComment[];
}

export class ArchitecturePlan {
  id: string;
  version: number;
  status: ArchitecturePlanStatus;
  tenant_id: string;
  product_id: string;
  title: string;
  prompt_source: string;
  scope: ArchitecturePlanScope;
  impact: ArchitecturePlanImpact;
  risk_assessment: ArchitecturePlanRiskAssessment;
  governance: ArchitecturePlanGovernance;
  execution_plan: ArchitecturePlanExecutionPlan;
  audit_trail: ArchitecturePlanAuditTrail;

  constructor(partial: Partial<ArchitecturePlan>) {
    Object.assign(this, partial);
    if (!this.version) this.version = 1;
    if (!this.status) this.status = ArchitecturePlanStatus.DRAFT;
    if (!this.audit_trail) {
      this.audit_trail = {
        created_by: 'system',
        created_at: new Date().toISOString(),
        comments: []
      };
    }
    if (!this.governance) this.governance = {};
  }
}
