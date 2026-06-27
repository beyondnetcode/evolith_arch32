package evolith.version_pinning_test

import data.evolith.version_pinning

test_no_pinning_violations_for_exact_versions {
  violations := version_pinning.violations with input as {"satellite": {"packageJson": {"dependencies": {"express": "4.18.2"}, "devDependencies": {}}, "workspacePackageJsons": []}}
  count(violations) == 0
}

test_caret_pinning_in_dependencies_is_rejected {
  violations := version_pinning.violations with input as {"satellite": {"packageJson": {"dependencies": {"express": "^4.18.2"}, "devDependencies": {}}, "workspacePackageJsons": []}}
  violations[_].id == "DEP-01"
}

test_tilde_pinning_in_dev_dependencies_is_rejected {
  violations := version_pinning.violations with input as {"satellite": {"packageJson": {"dependencies": {}, "devDependencies": {"mocha": "~10.0.0"}}, "workspacePackageJsons": []}}
  violations[_].id == "DEP-02"
}

test_wildcard_pinning_is_rejected {
  violations := version_pinning.violations with input as {"satellite": {"packageJson": {"dependencies": {"lodash": "*"}, "devDependencies": {}}, "workspacePackageJsons": []}}
  violations[_].id == "DEP-03"
}

test_workspace_caret_pinning_is_rejected {
  violations := version_pinning.violations with input as {"satellite": {"packageJson": {"dependencies": {}, "devDependencies": {}}, "workspacePackageJsons": [{"path": "packages/foo", "content": {"dependencies": {"react": "^18.0.0"}, "devDependencies": {}}}]}}
  violations[_].id == "DEP-10"
}
