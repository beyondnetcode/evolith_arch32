package evolith.cicd_quality_gates

import rego.v1

violations contains {"id": "CICD-01", "message": "CodeQL static analysis not configured in CI pipeline"} if {
	not input.satellite.ci.hasCodeql
}

violations contains {"id": "CICD-02", "message": "Dependency vulnerability audit not configured in CI pipeline"} if {
	not input.satellite.ci.hasDependencyAudit
}

violations contains {"id": "CICD-03", "message": "Secret detection not enabled on repository"} if {
	not input.satellite.ci.hasSecretDetection
}

violations contains {"id": "CICD-04", "message": "Not all quality gates are required before merge"} if {
	not input.satellite.ci.gatesRequiredBeforeMerge
}

violations contains {"id": "CICD-05", "message": "Security findings without documented justification or accepted risk — all findings must have a linked justification or resolution ticket"} if {
	input.satellite.findings.hasUnjustifiedSecurityFindings
}

violations contains {"id": "CICD-06", "message": "Critical findings SLA (24h) not tracked in issue tracker"} if {
	input.satellite.findings.criticalAgeHours > 24
}

violations contains {"id": "CICD-07", "message": "High findings SLA (72h) not tracked in issue tracker"} if {
	input.satellite.findings.highAgeHours > 72
}
