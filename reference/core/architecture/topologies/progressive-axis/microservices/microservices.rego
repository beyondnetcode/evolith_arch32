package evolith.topologies.microservices

import rego.v1

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Topology: Microservices (MS)
# ---------------------------------------------------------------------------

violations contains {"id": "MS-R01", "severity": "MUST", "title": "Containerization Enforced", "blocking": true, "msg": msg} if {
	not input.satellite.hasDockerfile
	msg := "No Dockerfile found at repository root (MS-R01)."
}

violations contains {"id": "MS-R02", "severity": "MUST", "title": "Explicit Service Boundaries", "blocking": true, "msg": msg} if {
	count(input.satellite.directories) < 2
	msg := "Found less than 2 services in src/ (MS-R02)."
}

violations contains {"id": "MS-R03", "severity": "MUST", "title": "Bulkhead Pattern per Service", "blocking": false, "msg": msg} if {
	not input.satellite.hasBulkhead
	msg := "No bulkhead isolation found per upstream dependency (MS-R03)."
}

violations contains {"id": "MS-R04", "severity": "MUST", "title": "Fallback Behavior for All External Calls", "blocking": false, "msg": msg} if {
	not input.satellite.hasFallback
	msg := "No fallback behavior defined for external calls (MS-R04)."
}

violations contains {"id": "MS-R05", "severity": "MUST", "title": "Contract Tests for All Inter-Service Contracts", "blocking": true, "msg": msg} if {
	not input.satellite.hasContractTests
	msg := "No contract tests found for inter-service contracts (MS-R05)."
}

violations contains {"id": "MS-R06", "severity": "MUST", "title": "Service Owns Its Data — No Shared Persistence", "blocking": true, "msg": msg} if {
	not input.satellite.hasDataSovereignty
	msg := "Shared persistence detected. Each service MUST own its data exclusively (MS-R06)."
}

violations contains {"id": "MS-R07", "severity": "MUST", "title": "Service-Level Observability with SLOs", "blocking": false, "msg": msg} if {
	not input.satellite.hasSloDashboards
	msg := "No SLO dashboards found per service (MS-R07)."
}

violations contains {"id": "MS-R08", "severity": "MUST", "title": "Service-Level On-Call Ownership", "blocking": false, "msg": msg} if {
	not input.satellite.hasOnCall
	msg := "No on-call roster found per service (MS-R08)."
}
