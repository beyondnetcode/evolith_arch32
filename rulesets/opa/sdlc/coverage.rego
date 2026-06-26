package evolith.sdlc.coverage

# Gate F3 — Coverage Report
# Business logic coverage must be >= 80%

default valid = false

# Check if coverage meets the threshold
valid if {
	input.coverage_percentage >= 80
}

# Provide actionable failure reason
reason[msg] if {
	not valid
	msg := sprintf("Coverage below threshold: got %d%%, expected >= 80%%", [input.coverage_percentage])
}

# Provide pass evidence
evidence[msg] if {
	valid
	msg := sprintf("Coverage at %d%% — meets >= 80%% threshold", [input.coverage_percentage])
}
