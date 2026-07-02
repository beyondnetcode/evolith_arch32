package evolith.governance.architecture_planning

# Default values
default sdlc_mode = "minimal"

# Rejected overrides all other modes
sdlc_mode = "rejected" {
    not input.scope.technical
}

sdlc_mode = "rejected" {
    input.scope.technical == ""
}

sdlc_mode = "rejected" {
    not input.scope.functional
}

# Full mode conditions
sdlc_mode = "full" {
    not is_rejected
    input.risk_assessment.criticality == "high"
}

sdlc_mode = "full" {
    not is_rejected
    count(input.risk_assessment.security_risks) > 0
}

# Tailored mode conditions
sdlc_mode = "tailored" {
    not is_rejected
    input.risk_assessment.criticality != "high"
    count(input.risk_assessment.security_risks) == 0
    input.risk_assessment.complexity == "medium"
}

# Helper to check if rejected
is_rejected {
    not input.scope.technical
}
is_rejected {
    input.scope.technical == ""
}
is_rejected {
    not input.scope.functional
}

# Required approvals based on sdlc_mode
required_approvals[role] {
    sdlc_mode == "full"
    roles := ["architecture_lead", "security_officer"]
    role := roles[_]
}

required_approvals[role] {
    sdlc_mode == "tailored"
    role := "architecture_lead"
}
