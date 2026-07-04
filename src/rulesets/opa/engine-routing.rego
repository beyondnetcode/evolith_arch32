package evolith.engine_routing

import rego.v1

# Default: deny routing to any engine (fail-closed)
default selected_engine := ""

# Route to stub engine when no risk signals are present or request is low-risk
selected_engine := "stub" if {
    not input.risk_assessment
}

selected_engine := "stub" if {
    input.risk_assessment
    input.risk_assessment.criticality == "low"
    not has_privacy_concerns
}

# Route to hermes engine for medium-risk requests without privacy concerns
selected_engine := "hermes" if {
    input.risk_assessment
    input.risk_assessment.criticality == "medium"
    not has_privacy_concerns
}

# Route to hermes engine for high-risk requests that are internally resolvable
selected_engine := "hermes" if {
    input.risk_assessment
    input.risk_assessment.criticality == "high"
    input.risk_assessment.security_risks == "none"
    not has_privacy_concerns
}

# Route to stub for any request with privacy concerns (data stays local)
selected_engine := "stub" if {
    has_privacy_concerns
}

# Route to stub for critical requests with security risks
selected_engine := "stub" if {
    input.risk_assessment
    input.risk_assessment.criticality == "critical"
}

# Route to stub when cost budget would be exceeded
selected_engine := "stub" if {
    input.cost_budget
    input.cost_budget.remaining_tokens < 1000
}

# Helper: check for privacy classification
has_privacy_concerns if {
    input.privacy_classification
    input.privacy_classification != "public"
}

# Violations for trace/audit
violations := v if {
    v := []
    count(v) == 0
}

# Routing reason for trace
routing_reason := reason if {
    selected_engine == "stub"
    reason := "Default/stub: low risk, privacy-sensitive, or budget-constrained"
}

routing_reason := reason if {
    selected_engine == "hermes"
    reason := "Hermes: medium/high risk, no privacy concerns, sufficient budget"
}
