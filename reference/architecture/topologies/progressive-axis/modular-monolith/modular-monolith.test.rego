package evolith.topologies.modular_monolith_test

import data.evolith.topologies.modular_monolith

test_compliant_modular_monolith_has_no_violations {
  violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
  count(violations) == 0
}

test_missing_ports_is_rejected {
  violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
  violations[_].id == "MM-R03"
}
