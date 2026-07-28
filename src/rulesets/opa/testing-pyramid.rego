package evolith.testing_pyramid

import rego.v1

violations contains {"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — unit tests below 65% or above 75%"} if {
	input.satellite.testing.unitTestPercentage < 65
}

violations contains {"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — integration tests below 15% or above 25%"} if {
	input.satellite.testing.integrationTestPercentage < 15
}

violations contains {"id": "TPY-01", "message": "Test distribution does not follow 70/20/10 pyramid — e2e tests below 5% or above 15%"} if {
	input.satellite.testing.e2eTestPercentage < 5
}

violations contains {"id": "TPY-02", "message": "Unit tests execute IO — must isolate pure core and application classes"} if {
	input.satellite.testing.unitTestsExecuteIo
}

violations contains {"id": "TPY-05", "message": "Business logic coverage below 80% threshold"} if {
	input.satellite.testing.businessLogicCoverage < 80
}

violations contains {"id": "TPY-06", "message": "Domain coverage below 95% threshold"} if {
	input.satellite.testing.domainCoverage < 95
}

violations contains {"id": "TPY-06", "message": "Application coverage below 85% threshold"} if {
	input.satellite.testing.applicationCoverage < 85
}

violations contains {"id": "TPY-06", "message": "Infrastructure coverage below 60% threshold"} if {
	input.satellite.testing.infrastructureCoverage < 60
}

violations contains {"id": "TPY-06", "message": "API/BFF coverage below 70% threshold"} if {
	input.satellite.testing.apiCoverage < 70
}

violations contains {"id": "TPY-03", "message": "Integration tests must use ephemeral containers (Docker/Testcontainers) — no shared persistent test databases allowed"} if {
	not input.satellite.testing.integrationUsesEphemeralContainers
}

violations contains {"id": "TPY-04", "message": "E2E tests must cover full HTTP routes — no E2E tests found against HTTP endpoints"} if {
	not input.satellite.testing.e2eCoversHttpRoutes
}

violations contains {"id": "TPY-07", "message": "Unit tests execute IO operations — must not use file system, network, or database"} if {
	input.satellite.testing.unitTestsHaveIoOperations
}
