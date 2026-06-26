package evolith.executive_scorecards

violations[{"id": "DORA-01", "message": "Deployment Frequency metric not declared or dashboard required but missing"}] {
    not input.satellite.scorecards.deploymentFrequencyDeclared
}

violations[{"id": "DORA-02", "message": "Lead Time for Changes metric not declared or dashboard required but missing"}] {
    not input.satellite.scorecards.leadTimeDeclared
}

violations[{"id": "DORA-03", "message": "Change Failure Rate metric not declared or dashboard required but missing"}] {
    not input.satellite.scorecards.changeFailureRateDeclared
}

violations[{"id": "DORA-04", "message": "Time to Restore (MTTR) metric not declared or dashboard required but missing"}] {
    not input.satellite.scorecards.timeToRestoreDeclared
}

violations[{"id": "SPACE-01", "message": "Observability infrastructure (traces, logs, metrics) not operational in production"}] {
    not input.satellite.scorecards.observabilityOperational
}

violations[{"id": "SPACE-02", "message": "Satellite performance (P95 latency) not measured or dashboard not linked in scorecards"}] {
    not input.satellite.scorecards.performanceDashboardLinked
}

violations[{"id": "SPACE-03", "message": "Team cognitive load survey not completed or score not recorded in satellite scorecards"}] {
    not input.satellite.scorecards.cognitivLoadSurveyCompleted
}

violations[{"id": "SPACE-04", "message": "Collaboration index (cross-team PRs and shared ADRs) not computed — required for SPACE executive review"}] {
    not input.satellite.scorecards.collaborationIndexComputed
}

violations[{"id": "SPACE-05", "message": "Executive sponsor not assigned or quarterly review not documented"}] {
    not input.satellite.scorecards.executiveSponsorAssigned
}

violations[{"id": "DRIFT-01", "message": "Architecture Drift Index not measured or exceeds 10% threshold"}] {
    input.satellite.scorecards.architectureDriftIndex > 10
}
