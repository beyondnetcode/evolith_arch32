package evolith.topologies.distributed_modules

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Topology: Distributed Modules (DM)
# ---------------------------------------------------------------------------

violations[{"id": "DM-R01", "severity": "MUST", "title": "Module Owns Its Lifecycle", "blocking": true, "msg": msg}] {
	count(input.satellite.workspacePackageJsons) <= 1
	msg := "No independent module package.json files found. Each module MUST own its lifecycle (DM-R01)."
}

violations[{"id": "DM-R02", "severity": "MUST", "title": "Inter-Module Contracts are Explicit and Versioned", "blocking": true, "msg": msg}] {
	input.satellite.hasContracts == false
	msg := "No contracts directory found for inter-module contracts (DM-R02)."
}

violations[{"id": "DM-R03", "severity": "MUST", "title": "Module Data Isolation Enforced", "blocking": true, "msg": msg}] {
	input.satellite.hasAcl == false
	msg := "No acl directory for data ownership enforcement found (DM-R03)."
}

violations[{"id": "DM-R04", "severity": "MUST", "title": "Async Events Have Schema-Validated Payloads", "blocking": false, "msg": msg}] {
	input.satellite.hasEvents == false
	msg := "No schema-validated event files found in events/ (DM-R04)."
}

violations[{"id": "DM-R05", "severity": "MUST", "title": "Distributed Tracing Across Modules", "blocking": true, "msg": msg}] {
	not input.satellite.hasOtel
	msg := "No distributed tracing setup found (DM-R05)."
}

violations[{"id": "DM-R06", "severity": "MUST", "title": "Modules Deployable Independently", "blocking": true, "msg": msg}] {
	not input.satellite.hasIndependentDeployment
	msg := "No independent deployment pipeline found. Each module MUST deploy independently (DM-R06)."
}

violations[{"id": "DM-R07", "severity": "MUST", "title": "Circuit Breaker for Inter-Module Calls", "blocking": false, "msg": msg}] {
	input.satellite.hasCircuitBreaker == false
	msg := "Circuit breaker not found in inter-module calls (DM-R07)."
}

violations[{"id": "DM-R08", "severity": "MUST", "title": "Maintain Extraction Readiness Score", "blocking": false, "msg": msg}] {
	not input.satellite.hasExtractionReadiness
	msg := "No extraction-readiness.md found in docs/ (DM-R08)."
}
