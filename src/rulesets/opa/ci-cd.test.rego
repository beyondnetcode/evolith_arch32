package evolith.ci_cd_test

import data.evolith.ci_cd

test_ci_compliant_project_has_no_violations {
  violations := ci_cd.violations with input as {"satellite": {"hasPackageLock": true, "workflows": {"ci.yml": "npm ci\ntests", "audit.yml": "npm audit"}, "hasDependabot": true}, "core": {"hasPackageLock": true}}
  count(violations) == 0
}

test_missing_package_lock_is_rejected {
  violations := ci_cd.violations with input as {"satellite": {"hasPackageLock": false, "workflows": {}, "hasDependabot": false}, "core": {"hasPackageLock": false}}
  violations[_].id == "DEP-04"
}

test_missing_npm_ci_in_workflow_is_rejected {
  violations := ci_cd.violations with input as {"satellite": {"hasPackageLock": true, "workflows": {"ci.yml": "npm install"}, "hasDependabot": true}, "core": {"hasPackageLock": true}}
  violations[_].id == "DEP-05"
}

test_missing_dependabot_is_rejected {
  violations := ci_cd.violations with input as {"satellite": {"hasPackageLock": true, "workflows": {"ci.yml": "npm ci"}, "hasDependabot": false, "hasRenovate": false}, "core": {"hasPackageLock": true, "hasDependabot": false}}
  violations[_].id == "DEP-09"
}
