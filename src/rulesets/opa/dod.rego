package evolith.dod

import rego.v1

# GT-380 / L1c: Definition-of-Done facts are read ONLY from the canonical
# EvaluationContext (`input.context.dod`). The legacy `input.story` root (a Tracker
# "story" entity) has been removed — no Core rule depends on stories.
#
# GT-382: "no facts → no opinion". Every rule is guarded by `dod_declared`, so when
# the consumer does NOT declare DoD facts (`input.context.dod` absent — e.g. the
# filesystem satellite-validation path) the policy emits ZERO violations and the gate
# is not blocked. DoD is evaluated only when the consumer actually sends DoD facts.
dod_declared if {
	input.context.dod
}

dod := object.get(object.get(input, "context", {}), "dod", {})

violations contains {"id": "DOD-01", "message": "Code review count must be >= 1"} if {
	dod_declared
	dod.reviewCount < 1
}

violations contains {"id": "DOD-02", "message": "Test coverage must be >= 80%"} if {
	dod_declared
	dod.coveragePercent < 80
}

violations contains {"id": "DOD-03", "message": "Acceptance criteria must be verified"} if {
	dod_declared
	not dod.acceptanceCriteriaVerified
}

violations contains {"id": "DOD-04", "message": "Documentation must be updated"} if {
	dod_declared
	not dod.documentationUpdated
}

violations contains {"id": "DOD-05", "message": "Observability instrumentation must be added"} if {
	dod_declared
	not dod.observabilityAdded
}

violations contains {"id": "DOD-06", "message": "Security gates must pass"} if {
	dod_declared
	not dod.securityGatesPassed
}

violations contains {"id": "DOD-07", "message": "ADR must be created when architectural decision is made"} if {
	dod_declared
	dod.architecturalDecisionMade
	not dod.adrCreated
}

violations contains {"id": "DOD-08", "message": "Integration tests must be passing"} if {
	dod_declared
	not dod.integrationTestsPassing
}

violations contains {"id": "DOD-09", "message": "Linting must pass"} if {
	dod_declared
	not dod.lintPassing
}

violations contains {"id": "DOD-10", "message": "CI pipeline must be green"} if {
	dod_declared
	not dod.ciGreen
}
