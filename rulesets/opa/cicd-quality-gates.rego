package evolith.cicd_quality_gates

violations[{"id": "CICD-01", "message": "CodeQL static analysis not configured in CI pipeline"}] {
    not input.satellite.ci.hasCodeql
}

violations[{"id": "CICD-02", "message": "Dependency vulnerability audit not configured in CI pipeline"}] {
    not input.satellite.ci.hasDependencyAudit
}

violations[{"id": "CICD-03", "message": "Secret detection not enabled on repository"}] {
    not input.satellite.ci.hasSecretDetection
}

violations[{"id": "CICD-04", "message": "Not all quality gates are required before merge"}] {
    not input.satellite.ci.gatesRequiredBeforeMerge
}

violations[{"id": "CICD-06", "message": "Critical findings SLA (24h) not tracked in issue tracker"}] {
    input.satellite.findings.criticalAgeHours > 24
}

violations[{"id": "CICD-07", "message": "High findings SLA (72h) not tracked in issue tracker"}] {
    input.satellite.findings.highAgeHours > 72
}
