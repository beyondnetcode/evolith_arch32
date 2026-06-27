package evolith.cli_core_parity_test

import data.evolith.cli_core_parity

compliant_input := {"satellite": {"coreParity": {
  "ruleWithoutParityRecord": false,
  "divergentValidationLogic": false,
  "inconsistentResults": false,
  "undocumentedParityGap": false,
}}}

test_compliant_core_parity_has_no_violations {
  violations := cli_core_parity.violations with input as compliant_input
  count(violations) == 0
}

test_rule_without_parity_record_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/coreParity/ruleWithoutParityRecord", "value": true}])
  violations := cli_core_parity.violations with input as i
  violations[_].id == "CLI-PAR-01"
}

test_divergent_logic_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/coreParity/divergentValidationLogic", "value": true}])
  violations := cli_core_parity.violations with input as i
  violations[_].id == "CLI-PAR-02"
}

test_inconsistent_results_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/coreParity/inconsistentResults", "value": true}])
  violations := cli_core_parity.violations with input as i
  violations[_].id == "CLI-PAR-03"
}

test_undocumented_parity_gap_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/coreParity/undocumentedParityGap", "value": true}])
  violations := cli_core_parity.violations with input as i
  violations[_].id == "CLI-PAR-04"
}
