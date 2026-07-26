package evolith.governance.architecture_planning

import rego.v1

# Default values
default sdlc_mode := "minimal"

# Rejected overrides all other modes
sdlc_mode := "rejected" if {
	not input.scope.technical
}

sdlc_mode := "rejected" if {
	input.scope.technical == ""
}

sdlc_mode := "rejected" if {
	not input.scope.functional
}

# Full mode conditions
sdlc_mode := "full" if {
	not is_rejected
	input.risk_assessment.criticality == "high"
}

sdlc_mode := "full" if {
	not is_rejected
	count(input.risk_assessment.security_risks) > 0
}

# Tailored mode conditions
sdlc_mode := "tailored" if {
	not is_rejected
	input.risk_assessment.criticality != "high"
	count(input.risk_assessment.security_risks) == 0
	input.risk_assessment.complexity == "medium"
}

# Helper to check if rejected
is_rejected if {
	not input.scope.technical
}

is_rejected if {
	input.scope.technical == ""
}

is_rejected if {
	not input.scope.functional
}

# Required approvals based on sdlc_mode
required_approvals contains role if {
	sdlc_mode == "full"
	roles := ["architecture_lead", "security_officer"]
	role := roles[_]
}

required_approvals contains role if {
	sdlc_mode == "tailored"
	role := "architecture_lead"
}
