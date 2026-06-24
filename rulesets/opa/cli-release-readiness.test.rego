package evolith.cli_release_readiness_test

import data.evolith.cli_release_readiness

compliant_input := {"satellite": {"releaseReadiness": {
  "buildPasses": true,
  "testsPass": true,
  "lockFilePresent": true,
  "mcpSmokePasses": true,
  "readmeExists": true,
}}}

test_compliant_release_readiness_has_no_violations {
  violations := cli_release_readiness.violations with input as compliant_input
  count(violations) == 0
}

test_build_failure_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/releaseReadiness/buildPasses", "value": false}])
  violations := cli_release_readiness.violations with input as i
  violations[_].id == "CLI-RR-01"
}

test_tests_failure_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/releaseReadiness/testsPass", "value": false}])
  violations := cli_release_readiness.violations with input as i
  violations[_].id == "CLI-RR-02"
}

test_missing_lock_file_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/releaseReadiness/lockFilePresent", "value": false}])
  violations := cli_release_readiness.violations with input as i
  violations[_].id == "CLI-RR-03"
}

test_mcp_smoke_failure_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/releaseReadiness/mcpSmokePasses", "value": false}])
  violations := cli_release_readiness.violations with input as i
  violations[_].id == "CLI-RR-04"
}

test_missing_readme_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/releaseReadiness/readmeExists", "value": false}])
  violations := cli_release_readiness.violations with input as i
  violations[_].id == "CLI-RR-05"
}
