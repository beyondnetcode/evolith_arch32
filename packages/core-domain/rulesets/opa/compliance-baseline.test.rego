package evolith.compliance_baseline_test

import data.evolith.compliance_baseline

test_compliant_baseline_has_no_violations {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "reference/agnostic-baseline.md",
                "referenceBlueprint": "reference/blueprint.md",
                "engineeringManifesto": "reference/engineering-manifesto.md",
                "definitionOfDone": "reference/dod.md",
                "repositoryTaxonomy": "reference/taxonomy.md"
            }
        }
    }
    count(violations) == 0
}

test_missing_pillar_is_violation {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "reference/agnostic-baseline.md",
                "referenceBlueprint": "reference/blueprint.md",
                "engineeringManifesto": "reference/engineering-manifesto.md",
                "definitionOfDone": "reference/dod.md"
            }
        }
    }
    violations[_].id == "CB-VAL-01"
}

test_empty_pillar_reference_is_violation {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "reference/agnostic-baseline.md",
                "referenceBlueprint": "",
                "engineeringManifesto": "reference/engineering-manifesto.md",
                "definitionOfDone": "reference/dod.md",
                "repositoryTaxonomy": "reference/taxonomy.md"
            }
        }
    }
    violations[_].id == "CB-VAL-02"
}

test_non_string_pillar_reference_is_violation {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "reference/agnostic-baseline.md",
                "referenceBlueprint": 123,
                "engineeringManifesto": "reference/engineering-manifesto.md",
                "definitionOfDone": "reference/dod.md",
                "repositoryTaxonomy": "reference/taxonomy.md"
            }
        }
    }
    violations[_].id == "CB-VAL-02"
}

test_multiple_missing_pillars {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "ref.md"
            }
        }
    }
    count(violations) >= 1
    violations[_].id == "CB-VAL-01"
}

test_all_empty_references {
    violations := compliance_baseline.violations with input as {
        "spec": {
            "compliance": {
                "agnosticBaseline": "",
                "referenceBlueprint": "",
                "engineeringManifesto": "",
                "definitionOfDone": "",
                "repositoryTaxonomy": ""
            }
        }
    }
    count(violations) == 5
}
