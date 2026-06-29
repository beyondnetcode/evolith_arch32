package evolith.dod

# GT-380 / L1c: Definition-of-Done facts are read ONLY from the canonical
# EvaluationContext (`input.context.dod`). The legacy `input.story` root (a Tracker
# "story" entity) has been removed — no Core rule depends on stories. When the
# consumer declares no DoD facts, `dod` resolves to `{}` and the checks evaluate
# against it.
dod := object.get(object.get(input, "context", {}), "dod", {})

violations[{"id": "DOD-01", "message": "Code review count must be >= 1"}] {
    dod.reviewCount < 1
}

violations[{"id": "DOD-02", "message": "Test coverage must be >= 80%"}] {
    dod.coveragePercent < 80
}

violations[{"id": "DOD-03", "message": "Acceptance criteria must be verified"}] {
    not dod.acceptanceCriteriaVerified
}

violations[{"id": "DOD-04", "message": "Documentation must be updated"}] {
    not dod.documentationUpdated
}

violations[{"id": "DOD-05", "message": "Observability instrumentation must be added"}] {
    not dod.observabilityAdded
}

violations[{"id": "DOD-06", "message": "Security gates must pass"}] {
    not dod.securityGatesPassed
}

violations[{"id": "DOD-07", "message": "ADR must be created when architectural decision is made"}] {
    dod.architecturalDecisionMade
    not dod.adrCreated
}

violations[{"id": "DOD-08", "message": "Integration tests must be passing"}] {
    not dod.integrationTestsPassing
}

violations[{"id": "DOD-09", "message": "Linting must pass"}] {
    not dod.lintPassing
}

violations[{"id": "DOD-10", "message": "CI pipeline must be green"}] {
    not dod.ciGreen
}
