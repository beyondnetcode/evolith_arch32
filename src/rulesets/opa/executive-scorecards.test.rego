package evolith.executive_scorecards_test

import rego.v1

import data.evolith.executive_scorecards

compliant_input := {"satellite": {"scorecards": {
	"deploymentFrequencyDeclared": true,
	"leadTimeDeclared": true,
	"changeFailureRateDeclared": true,
	"timeToRestoreDeclared": true,
	"observabilityOperational": true,
	"executiveSponsorAssigned": true,
	"architectureDriftIndex": 5,
	"performanceDashboardLinked": true,
	"cognitiveLoadSurveyCompleted": true,
	"collaborationIndexComputed": true,
}}}

test_compliant_scorecards_has_no_violations if {
	violations := executive_scorecards.violations with input as compliant_input
	count(violations) == 0
}

test_missing_deployment_frequency_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/deploymentFrequencyDeclared", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "DORA-01"
}

test_missing_lead_time_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/leadTimeDeclared", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "DORA-02"
}

test_missing_change_failure_rate_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/changeFailureRateDeclared", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "DORA-03"
}

test_missing_time_to_restore_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/timeToRestoreDeclared", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "DORA-04"
}

test_missing_observability_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/observabilityOperational", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "SPACE-01"
}

test_missing_executive_sponsor_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/executiveSponsorAssigned", "value": false}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "SPACE-05"
}

test_drift_index_exceeding_threshold_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/scorecards/architectureDriftIndex", "value": 15}])
	violations := executive_scorecards.violations with input as i
	violations[_].id == "DRIFT-01"
}
