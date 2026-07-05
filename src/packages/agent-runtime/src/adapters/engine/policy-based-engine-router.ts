import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

/**
 * Risk assessment signals extracted from the request context.
 */
export interface RiskAssessment {
  readonly criticality: 'low' | 'medium' | 'high' | 'critical';
  readonly security_risks: 'none' | 'low' | 'medium' | 'high';
  readonly complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Privacy classification of the request data.
 */
export type PrivacyClassification = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * Cost budget constraints for engine selection.
 */
export interface CostBudget {
  readonly remaining_tokens: number;
  readonly max_cost_usd?: number;
}

/**
 * Policy context evaluated by the router before engine selection.
 */
export interface RoutingPolicyContext {
  readonly risk_assessment?: RiskAssessment;
  readonly privacy_classification?: PrivacyClassification;
  readonly cost_budget?: CostBudget;
}

/**
 * Result of a policy-based routing decision.
 */
export interface RoutingDecision {
  readonly engine: string;
  readonly reason: string;
  readonly risk_assessment?: RiskAssessment;
  readonly privacy_classification?: PrivacyClassification;
}

/**
 * GT-407: Policy-based engine router.
 *
 * Evaluates request context (risk, privacy, cost) against a routing policy
 * to select the appropriate engine. Falls back to the default engine when
 * no policy rule matches (fail-closed).
 *
 * The router does NOT execute capabilities — it only selects which engine
 * adapter should propose a plan. All governance (approval, OPA, tracing)
 * happens downstream in the runtime pipeline.
 */
export class PolicyBasedEngineRouter implements IAgentEnginePort {
  constructor(
    private readonly engines: Readonly<Record<string, IAgentEnginePort>>,
    private readonly defaultEngine: string = 'stub',
    private readonly policyEvaluator?: (ctx: RoutingPolicyContext) => RoutingDecision,
  ) {}

  async plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<AgentEnginePlan> {
    // Build policy context from request
    const policyContext = this.buildPolicyContext(request);

    // Evaluate routing policy
    let decision: RoutingDecision;
    if (this.policyEvaluator) {
      decision = this.policyEvaluator(policyContext);
    } else {
      decision = this.evaluateDefaultPolicy(policyContext);
    }

    // Select the engine
    const engine = this.engines[decision.engine];
    if (!engine) {
      // Fallback to default if selected engine not available
      const fallback = this.engines[this.defaultEngine];
      if (!fallback) {
        return {
          rationale: `No engine available for '${decision.engine}' and no default engine configured`,
          engine: 'none',
        };
      }
      return fallback.plan(request, availableSkills);
    }

    return engine.plan(request, availableSkills);
  }

  /**
   * Extracts policy-relevant signals from the request context.
   */
  private buildPolicyContext(request: AgentRuntimeRequest): RoutingPolicyContext {
    const params = (request.parameters || {}) as Record<string, unknown>;
    const riskAssessment = params.risk_assessment as RiskAssessment | undefined;
    const privacyClassification = params.privacy_classification as PrivacyClassification | undefined;
    const costBudget = params.cost_budget as CostBudget | undefined;

    // Infer risk from source interface if not explicitly provided
    const inferredCriticality = this.inferCriticality(request);

    return {
      risk_assessment: riskAssessment || {
        criticality: inferredCriticality,
        security_risks: 'none',
        complexity: 'simple',
      },
      privacy_classification: privacyClassification,
      cost_budget: costBudget,
    };
  }

  /**
   * Infers criticality level from request characteristics when not explicitly provided.
   */
  private inferCriticality(request: AgentRuntimeRequest): 'low' | 'medium' | 'high' | 'critical' {
    // Dry-run requests are always low risk
    if (request.dryRun) return 'low';

    // Requests with explicit approval are higher trust
    if (request.approval?.granted) return 'medium';

    // MCP and external trigger sources default to medium
    if (request.sourceInterface === 'mcp' || request.sourceInterface === 'external_trigger') {
      return 'medium';
    }

    // CLI and chat are lower risk (human-in-the-loop by nature)
    return 'low';
  }

  /**
   * Default policy: evaluates risk/privacy/cost signals without OPA.
   * This is the built-in fallback when no external policy evaluator is configured.
   */
  private evaluateDefaultPolicy(ctx: RoutingPolicyContext): RoutingDecision {
    const risk = ctx.risk_assessment;

    // Privacy-sensitive requests always go to stub (local processing)
    if (ctx.privacy_classification && ctx.privacy_classification !== 'public') {
      return {
        engine: this.defaultEngine,
        reason: `Privacy classification '${ctx.privacy_classification}' — using local engine`,
        risk_assessment: risk,
        privacy_classification: ctx.privacy_classification,
      };
    }

    // Budget-constrained requests go to stub
    if (ctx.cost_budget && ctx.cost_budget.remaining_tokens < 1000) {
      return {
        engine: this.defaultEngine,
        reason: 'Cost budget exhausted — using local engine',
        risk_assessment: risk,
      };
    }

    // Critical requests with security risks go to stub
    if (risk?.criticality === 'critical' || risk?.security_risks === 'high') {
      return {
        engine: this.defaultEngine,
        reason: `Critical risk (${risk.criticality}/${risk.security_risks}) — using local engine`,
        risk_assessment: risk,
      };
    }

    // Medium risk without privacy concerns → hermes if available
    if (risk?.criticality === 'medium' && this.engines['hermes']) {
      return {
        engine: 'hermes',
        reason: 'Medium risk, no privacy concerns — routing to Hermes',
        risk_assessment: risk,
      };
    }

    // High risk without security issues → hermes if available
    if (risk?.criticality === 'high' && risk?.security_risks === 'none' && this.engines['hermes']) {
      return {
        engine: 'hermes',
        reason: 'High risk but no security concerns — routing to Hermes',
        risk_assessment: risk,
      };
    }

    // Default: use the configured default engine
    return {
      engine: this.defaultEngine,
      reason: 'Default routing — no policy match',
      risk_assessment: risk,
    };
  }
}
