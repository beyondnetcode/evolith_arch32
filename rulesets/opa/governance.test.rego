package evolith.governance_test

import data.evolith.governance

test_satellite_without_rulesets_has_no_violations {
  violations := governance.violations with input as {"satellitePath": "/satellite", "corePath": "/core", "satellite": {"directories": ["src", "docs"], "files": ["DECISIONS.md", "README.md"], "contracts": {"coreVersionPinned": true}}}
  count(violations) == 0
}

test_satellite_with_rulesets_is_rejected {
  violations := governance.violations with input as {"satellitePath": "/satellite", "corePath": "/core", "satellite": {"directories": ["rulesets", "src"], "files": ["DECISIONS.md"]}}
  violations[_].id == "INH-01"
}

test_satellite_missing_decisions_md_is_rejected {
  violations := governance.violations with input as {"satellitePath": "/satellite", "corePath": "/core", "satellite": {"directories": ["src"], "files": ["README.md"]}}
  violations[_].id == "INH-06"
}

test_core_repo_is_exempt_from_inheritance_rules {
  violations := governance.violations with input as {"satellitePath": "/core", "corePath": "/core", "satellite": {"directories": ["rulesets"], "files": []}}
  count(violations) == 0
}
