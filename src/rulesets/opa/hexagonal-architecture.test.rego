package evolith.hexagonal_architecture_test

import data.evolith.hexagonal_architecture

compliant_input := {"satellite": {"layers": {
  "core": {"hasFrameworkImports": false, "hasAopDecorators": false, "domainTestsRequireBootstrap": false},
  "application": {"hasInfrastructureImports": false, "hasAopDecorators": false},
  "infrastructure": {"implementsPorts": true},
  "hasBackwardImports": false,
}}}

test_compliant_hexagonal_has_no_violations {
  violations := hexagonal_architecture.violations with input as compliant_input
  count(violations) == 0
}

test_core_framework_imports_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/core/hasFrameworkImports", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-01"
}

test_application_infrastructure_imports_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/application/hasInfrastructureImports", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-02"
}

test_infrastructure_not_implementing_ports_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/infrastructure/implementsPorts", "value": false}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-03"
}

test_backward_imports_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/hasBackwardImports", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-04"
}

test_aop_in_core_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/core/hasAopDecorators", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-05"
}

test_aop_in_application_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/application/hasAopDecorators", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-05"
}

test_domain_tests_requiring_bootstrap_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/layers/core/domainTestsRequireBootstrap", "value": true}])
  violations := hexagonal_architecture.violations with input as i
  violations[_].id == "HXA-07"
}
