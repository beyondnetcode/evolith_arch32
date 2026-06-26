package evolith.testing_pyramid

violations[{"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — unit tests below 65% or above 75%"}] {
    input.satellite.testing.unitTestPercentage < 65
}

violations[{"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — integration tests below 15% or above 25%"}] {
    input.satellite.testing.integrationTestPercentage < 15
}

violations[{"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — e2e tests below 5% or above 15%"}] {
    input.satellite.testing.e2eTestPercentage < 5
}

violations[{"id": "TPY-02", "message": "Unit tests execute IO — must isolate pure core and application classes"}] {
    input.satellite.testing.unitTestsExecuteIo
}

violations[{"id": "TPY-05", "message": "Business logic coverage below 80% threshold"}] {
    input.satellite.testing.businessLogicCoverage < 80
}

violations[{"id": "TPY-06", "message": "Domain coverage below 95% threshold"}] {
    input.satellite.testing.domainCoverage < 95
}

violations[{"id": "TPY-06", "message": "Application coverage below 85% threshold"}] {
    input.satellite.testing.applicationCoverage < 85
}

violations[{"id": "TPY-06", "message": "Infrastructure coverage below 60% threshold"}] {
    input.satellite.testing.infrastructureCoverage < 60
}

violations[{"id": "TPY-06", "message": "API/BFF coverage below 70% threshold"}] {
    input.satellite.testing.apiCoverage < 70
}

violations[{"id": "TPY-03", "message": "Integration tests must use ephemeral containers (Docker/Testcontainers) — no shared persistent test databases allowed"}] {
    not input.satellite.testing.integrationUsesEphemeralContainers
}

violations[{"id": "TPY-04", "message": "E2E tests must cover full HTTP routes — no E2E tests found against HTTP endpoints"}] {
    not input.satellite.testing.e2eCoversHttpRoutes
}

violations[{"id": "TPY-07", "message": "Unit tests execute IO operations — must not use file system, network, or database"}] {
    input.satellite.testing.unitTestsHaveIoOperations
}
