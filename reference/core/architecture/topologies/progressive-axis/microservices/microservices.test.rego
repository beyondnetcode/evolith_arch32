package evolith.topologies.microservices_test

import data.evolith.topologies.microservices

test_compliant_microservices_has_no_violations {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": true}}
  count(violations) == 0
}

test_missing_dockerfile_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": false, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": true}}
  violations[_].id == "MS-R01"
}

test_missing_bulkhead_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": false, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": true}}
  violations[_].id == "MS-R03"
}

test_missing_fallback_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": false, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": true}}
  violations[_].id == "MS-R04"
}

test_missing_contract_tests_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": false, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": true}}
  violations[_].id == "MS-R05"
}

test_missing_data_sovereignty_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": false, "hasSloDashboards": true, "hasOnCall": true}}
  violations[_].id == "MS-R06"
}

test_missing_slos_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": false, "hasOnCall": true}}
  violations[_].id == "MS-R07"
}

test_missing_oncall_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"], "hasBulkhead": true, "hasFallback": true, "hasContractTests": true, "hasDataSovereignty": true, "hasSloDashboards": true, "hasOnCall": false}}
  violations[_].id == "MS-R08"
}
