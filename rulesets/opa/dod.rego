package evolith.dod

violations[{"id": "DOD-01", "message": "Code review count must be >= 1"}] {
    input.story.reviewCount < 1
}

violations[{"id": "DOD-02", "message": "Test coverage must be >= 80%"}] {
    input.story.coveragePercent < 80
}

violations[{"id": "DOD-03", "message": "Acceptance criteria must be verified"}] {
    not input.story.acceptanceCriteriaVerified
}

violations[{"id": "DOD-04", "message": "Documentation must be updated"}] {
    not input.story.documentationUpdated
}

violations[{"id": "DOD-05", "message": "Observability instrumentation must be added"}] {
    not input.story.observabilityAdded
}

violations[{"id": "DOD-06", "message": "Security gates must pass"}] {
    not input.story.securityGatesPassed
}

violations[{"id": "DOD-07", "message": "ADR must be created when architectural decision is made"}] {
    input.story.architecturalDecisionMade
    not input.story.adrCreated
}

violations[{"id": "DOD-08", "message": "Integration tests must be passing"}] {
    not input.story.integrationTestsPassing
}

violations[{"id": "DOD-09", "message": "Linting must pass"}] {
    not input.story.lintPassing
}

violations[{"id": "DOD-10", "message": "CI pipeline must be green"}] {
    not input.story.ciGreen
}
