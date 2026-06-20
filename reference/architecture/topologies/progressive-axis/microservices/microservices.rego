package evolith.topologies.microservices

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Topology: Microservices (MS)
# ---------------------------------------------------------------------------

violations[{"id": "MS-R01", "severity": "MUST", "title": "Containerization Enforced", "blocking": true, "msg": msg}] {
	not input.satellite.hasDockerfile
	msg := "No Dockerfile found at repository root (MS-R01)."
}

violations[{"id": "MS-R02", "severity": "MUST", "title": "Explicit Service Boundaries", "blocking": true, "msg": msg}] {
	count(input.satellite.directories) < 2
	msg := "Found less than 2 services in src/ (MS-R02)."
}
