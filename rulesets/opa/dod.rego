package evolith.dod

# GT-380 / L1c: Definition-of-Done facts are read ONLY from the canonical
# EvaluationContext (`input.context.dod`). The legacy `input.story` root (a Tracker
# "story" entity) has been removed — no Core rule depends on stories.
#
# GT-382: "no facts → no opinion". Every rule is guarded by `dod_declared`, so when
# the consumer does NOT declare DoD facts (`input.context.dod` absent — e.g. the
# filesystem satellite-validation path) the policy emits ZERO violations and the gate
# is not blocked. DoD is evaluated only when the consumer actually sends DoD facts.
dod_declared {
    input.context.dod
}

dod := object.get(object.get(input, "context", {}), "dod", {})

violations[{"id": "DOD-01", "message": "Code review count must be >= 1"}] {
    dod_declared
    dod.reviewCount < 1
}

violations[{"id": "DOD-02", "message": "Test coverage must be >= 80%"}] {
    dod_declared
    dod.coveragePercent < 80
}

violations[{"id": "DOD-03", "message": "Acceptance criteria must be verified"}] {
    dod_declared
    not dod.acceptanceCriteriaVerified
}

violations[{"id": "DOD-04", "message": "Documentation must be updated"}] {
    dod_declared
    not dod.documentationUpdated
}

violations[{"id": "DOD-05", "message": "Observability instrumentation must be added"}] {
    dod_declared
    not dod.observabilityAdded
}

violations[{"id": "DOD-06", "message": "Security gates must pass"}] {
    dod_declared
    not dod.securityGatesPassed
}

violations[{"id": "DOD-07", "message": "ADR must be created when architectural decision is made"}] {
    dod_declared
    dod.architecturalDecisionMade
    not dod.adrCreated
}

violations[{"id": "DOD-08", "message": "Integration tests must be passing"}] {
    dod_declared
    not dod.integrationTestsPassing
}

violations[{"id": "DOD-09", "message": "Linting must pass"}] {
    dod_declared
    not dod.lintPassing
}

violations[{"id": "DOD-10", "message": "CI pipeline must be green"}] {
    dod_declared
    not dod.ciGreen
}
