package evolith.sdlc.coverage

import rego.v1

# Gate F3 — Quality Thresholds (QT-01..08)

violations contains {"id": "QT-01", "message": msg} if {
	input.coverage_percentage < 80
	msg := sprintf("QT-01: Coverage below threshold: got %d%%, expected >= 80%%", [input.coverage_percentage])
}

violations contains {"id": "QT-02", "message": msg} if {
	input.maxCyclomaticComplexity > 15
	msg := sprintf("QT-02: Cyclomatic complexity exceeds 15 (found %d) — refactor required before merge", [input.maxCyclomaticComplexity])
}

violations contains {"id": "QT-03", "message": msg} if {
	input.criticalCveCount > 0
	msg := sprintf("QT-03: %d Critical CVE(s) detected — merge blocked until resolved", [input.criticalCveCount])
}

violations contains {"id": "QT-03", "message": msg} if {
	input.highCveCount > 0
	msg := sprintf("QT-03: %d High CVE(s) detected — justification required before merge", [input.highCveCount])
}

violations contains {"id": "QT-04", "message": msg} if {
	input.technicalDebtRatio > 5
	not input.technicalDebtRemediationPlanExists
	msg := sprintf("QT-04: Technical debt ratio is %v%% (threshold: 5%%) — remediation plan required for RC stamp", [input.technicalDebtRatio])
}

violations contains {"id": "QT-06", "message": "QT-06: Code behavior change detected without corresponding documentation update — architecture, API, or ops runbook docs must be updated"} if {
	input.behaviorChangedWithoutDocUpdate
}

violations contains {"id": "QT-07", "message": msg} if {
	input.apiPathsWithoutObservability > 0
	msg := sprintf("QT-07: %d production API path(s) missing traces, logs, or metrics — Production Live blocked", [input.apiPathsWithoutObservability])
}

violations contains {"id": "QT-08", "message": "QT-08: Breaking contract change to gRPC/REST inter-module interface detected — consumer-driven contract tests must pass before merge"} if {
	input.breakingContractChange
	not input.contractTestsPassed
}

default allow := false

allow if {
	count(violations) == 0
}
