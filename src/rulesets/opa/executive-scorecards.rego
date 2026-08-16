package evolith.executive_scorecards

import rego.v1

violations contains {"id": "DORA-01", "message": "Deployment Frequency metric not declared or dashboard required but missing"} if {
	not input.satellite.scorecards.deploymentFrequencyDeclared
}

violations contains {"id": "DORA-02", "message": "Lead Time for Changes metric not declared or dashboard required but missing"} if {
	not input.satellite.scorecards.leadTimeDeclared
}

violations contains {"id": "DORA-03", "message": "Change Failure Rate metric not declared or dashboard required but missing"} if {
	not input.satellite.scorecards.changeFailureRateDeclared
}

violations contains {"id": "DORA-04", "message": "Time to Restore (MTTR) metric not declared or dashboard required but missing"} if {
	not input.satellite.scorecards.timeToRestoreDeclared
}

violations contains {"id": "SPACE-01", "message": "Observability infrastructure (traces, logs, metrics) not operational in production"} if {
	not input.satellite.scorecards.observabilityOperational
}

violations contains {"id": "SPACE-02", "message": "Satellite performance (P95 latency) not measured or dashboard not linked in scorecards"} if {
	not input.satellite.scorecards.performanceDashboardLinked
}

violations contains {"id": "SPACE-03", "message": "Team cognitive load survey not completed or score not recorded in satellite scorecards"} if {
	not input.satellite.scorecards.cognitiveLoadSurveyCompleted
}

violations contains {"id": "SPACE-04", "message": "Collaboration index (cross-team PRs and shared ADRs) not computed — required for SPACE executive review"} if {
	not input.satellite.scorecards.collaborationIndexComputed
}

violations contains {"id": "SPACE-05", "message": "Executive sponsor not assigned or quarterly review not documented"} if {
	not input.satellite.scorecards.executiveSponsorAssigned
}

violations contains {"id": "DRIFT-01", "message": "Architecture Drift Index not measured or exceeds 10% threshold"} if {
	input.satellite.scorecards.architectureDriftIndex > 10
}
