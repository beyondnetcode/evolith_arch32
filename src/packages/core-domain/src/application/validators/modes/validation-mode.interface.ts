/**
 * GT-312: Composable Validation Engine
 * Validation mode interface for multi-entry-point validation.
 */

export type ValidationModeName = 'sdlc' | 'architecture' | 'ruleset' | 'adr' | 'adhoc';

export interface EvaluatedRuleFinding {
  readonly ruleId: string;
  readonly severity: 'MUST' | 'SHOULD' | 'COULD';
  readonly title: string;
  readonly description?: string;
  readonly file?: string;
  readonly blocking: boolean;
  /** GT-699 — `false` means the rule never ran; an admission, not a verdict. */
  readonly evaluated?: boolean;
}

/** GT-701 — what a real evaluation returns to a mode. A subset of `ValidationResult`. */
export interface RulesetEvaluationOutcome {
  readonly status: 'passed' | 'failed' | 'warning';
  readonly rulesChecked: number;
  readonly rulesSkipped?: number;
  readonly rulesErrored?: number;
  readonly rulesTotal?: number;
  readonly skippedRuleIds?: string[];
  readonly erroredRuleIds?: string[];
  readonly issues: readonly EvaluatedRuleFinding[];
}

/**
 * GT-701 — the composable surface's route to an engine.
 *
 * Declared STRUCTURALLY and never imported as a class, so the modes keep their
 * zero-argument constructors and core-domain's layering is untouched;
 * `RulesetValidatorService` satisfies it as it stands, with no adapter.
 *
 * Optional on the context by necessity, not by taste — a host that cannot build
 * a validator must still be able to call the surface. What is NOT optional is
 * what happens then: a mode without an evaluator refuses. It does not report the
 * rules it merely parsed as passing, which is the defect this port was added to
 * end.
 */
export interface RulesetEvaluationPort {
  validate(
    satellitePath: string,
    corePath?: string,
    selection?: { readonly rulesetRef?: string; readonly policyRefs?: readonly string[] },
  ): Promise<RulesetEvaluationOutcome>;
}

export interface ValidationContext {
  satellitePath: string;
  corePath?: string;
  engine: 'native' | 'opa';
  topology?: string;
  phase?: string;
  rulesetId?: string;
  adrId?: string;
  filePath?: string;
  customRules?: unknown[];
  /**
   * GT-701 — supplied by the host, already built for {@link ValidationContext.engine}.
   *
   * The engine choice is honoured HERE, at construction, because a mode has no
   * way to build an evaluator and `engine` was otherwise merged into this context
   * and read by nobody on any of the three surfaces that accept it.
   */
  evaluator?: RulesetEvaluationPort;
}

export interface ModeValidationResult {
  mode: ValidationModeName;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  rulesChecked: number;
  /**
   * GT-569 — the denominator behind `rulesChecked`, so an aggregate built from
   * several modes can report checked/skipped/errored/total instead of a bare
   * coverage number. Optional: a mode that cannot distinguish the outcomes
   * omits them and the aggregate falls back to `rulesChecked` as the total.
   */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  issues: ModeValidationIssue[];
  evidence?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ModeValidationIssue {
  ruleId: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  severity: 'error' | 'warning' | 'info';
  file?: string;
  line?: number;
  remediation?: string;
}

export interface ValidationMode {
  readonly name: ValidationModeName;

  canHandle(context: ValidationContext): boolean;

  validate(context: ValidationContext): Promise<ModeValidationResult>;
}
