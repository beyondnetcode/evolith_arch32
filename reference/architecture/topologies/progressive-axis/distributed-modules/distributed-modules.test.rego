package evolith.topologies.distributed_modules_test

import data.evolith.topologies.distributed_modules

test_compliant_distributed_modules_has_no_violations {
  violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasExtractionReadiness": true}}
  count(violations) == 0
}

test_single_module_is_rejected {
  violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasExtractionReadiness": true}}
  violations[_].id == "DM-R01"
}
