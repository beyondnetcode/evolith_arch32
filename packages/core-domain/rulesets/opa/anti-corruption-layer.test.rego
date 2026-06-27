package evolith.acl_test

import data.evolith.acl

test_compliant_adapter_has_no_violations {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": false,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    count(violations) == 0
}

test_schema_not_validated_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": false,
            "transformationTraceable": true,
            "silentNormalization": false,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-01"
}

test_transformation_not_traceable_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": false,
            "silentNormalization": false,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-02"
}

test_silent_normalization_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": true,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-03"
}

test_missing_core_compatibility_version_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": false,
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-04"
}

test_empty_core_compatibility_version_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": false,
            "coreCompatibilityVersion": "",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-04"
}

test_adapter_in_domain_path_is_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": false,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Domain/jira-adapter.ts"
        }
    }
    violations[_].id == "ACL-06"
}

test_adapter_in_infrastructure_path_is_not_violation {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": true,
            "transformationTraceable": true,
            "silentNormalization": false,
            "coreCompatibilityVersion": "1.0.0",
            "location": "src/Infrastructure/Adapters/jira-adapter.ts"
        }
    }
    count(violations) == 0
}

test_all_violations_detected {
    violations := acl.violations with input as {
        "adapter": {
            "schemaValidated": false,
            "transformationTraceable": false,
            "silentNormalization": true,
            "location": "src/Domain/jira-adapter.ts"
        }
    }
    count(violations) >= 4
}
