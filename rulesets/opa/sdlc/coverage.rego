package evolith.sdlc.coverage

# Gate F3 — Coverage Report
# Business logic coverage must be >= 80%

violations[msg] {
	input.coverage_percentage < 80
	msg := sprintf("Coverage below threshold: got %d%%, expected >= 80%%", [input.coverage_percentage])
}

default allow = false

allow {
	count(violations) == 0
}
