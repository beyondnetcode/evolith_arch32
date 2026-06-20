package evolith.topologies.microservices_test

import data.evolith.topologies.microservices

test_compliant_microservices_has_no_violations {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": true, "directories": ["identity", "orders"]}}
  count(violations) == 0
}

test_missing_dockerfile_is_rejected {
  violations := microservices.violations with input as {"satellite": {"hasDockerfile": false, "directories": ["identity", "orders"]}}
  violations[_].id == "MS-R01"
}
