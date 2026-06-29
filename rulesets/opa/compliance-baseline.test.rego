package evolith.compliance_baseline_test

import data.evolith.compliance_baseline

# GT-380 / L1c + GT-382: the compliance spec is read from input.context.spec; satellite
# facts (workflows/directories) remain filesystem-sourced (input.satellite fallback).

test_compliant_baseline_has_no_violations {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {
            "agnosticBaseline": "reference/agnostic-baseline.md",
            "referenceBlueprint": "reference/blueprint.md",
            "engineeringManifesto": "reference/engineering-manifesto.md",
            "definitionOfDone": "reference/dod.md",
            "repositoryTaxonomy": "reference/taxonomy.md"
        }}},
        "satellite": {"workflows": ["lint"], "directories": ["src"]}
    }
    count(violations) == 0
}

test_missing_pillar_is_violation {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {
            "agnosticBaseline": "reference/agnostic-baseline.md",
            "referenceBlueprint": "reference/blueprint.md",
            "engineeringManifesto": "reference/engineering-manifesto.md",
            "definitionOfDone": "reference/dod.md"
        }}}
    }
    violations[_].id == "CB-VAL-01"
}

test_empty_pillar_reference_is_violation {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {
            "agnosticBaseline": "reference/agnostic-baseline.md",
            "referenceBlueprint": "",
            "engineeringManifesto": "reference/engineering-manifesto.md",
            "definitionOfDone": "reference/dod.md",
            "repositoryTaxonomy": "reference/taxonomy.md"
        }}}
    }
    violations[_].id == "CB-VAL-02"
}

test_non_string_pillar_reference_is_violation {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {
            "agnosticBaseline": "reference/agnostic-baseline.md",
            "referenceBlueprint": 123,
            "engineeringManifesto": "reference/engineering-manifesto.md",
            "definitionOfDone": "reference/dod.md",
            "repositoryTaxonomy": "reference/taxonomy.md"
        }}}
    }
    violations[_].id == "CB-VAL-02"
}

test_multiple_missing_pillars {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {"agnosticBaseline": "ref.md"}}}
    }
    count(violations) >= 1
    violations[_].id == "CB-VAL-01"
}

test_all_empty_references {
    violations := compliance_baseline.violations with input as {
        "context": {"spec": {"compliance": {
            "agnosticBaseline": "",
            "referenceBlueprint": "",
            "engineeringManifesto": "",
            "definitionOfDone": "",
            "repositoryTaxonomy": ""
        }}},
        "satellite": {"workflows": ["lint"], "directories": ["src"]}
    }
    count(violations) == 5
}

# GT-382: no compliance spec declared → no opinion (FS-path / no-context safety).
test_absent_spec_yields_no_violations {
    violations := compliance_baseline.violations with input as {}
    count(violations) == 0
}

test_context_without_spec_yields_no_violations {
    violations := compliance_baseline.violations with input as {"context": {"tenant": {"tenantId": "t1"}}}
    count(violations) == 0
}
