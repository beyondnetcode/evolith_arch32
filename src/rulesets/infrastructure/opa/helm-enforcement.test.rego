package evolith.infrastructure_test

import rego.v1

import data.evolith.infrastructure

test_valid_helm_chart_is_allowed if {
	infrastructure.allow with input as {"files": ["Chart.yaml", "values.yaml", "templates/deployment.yaml"]}
}

test_empty_file_list_is_allowed if {
	infrastructure.allow with input as {"files": []}
}

test_raw_k8s_manifest_is_denied if {
	count(infrastructure.deny) > 0 with input as {"files": ["reference/infrastructure/kubernetes/deploy.yaml"]}
}

test_file_in_templates_is_allowed if {
	infrastructure.allow with input as {"files": ["templates/service.yaml"]}
}

test_chart_yaml_is_allowed if {
	infrastructure.allow with input as {"files": ["Chart.yaml"]}
}

test_values_yaml_is_allowed if {
	infrastructure.allow with input as {"files": ["values.yaml"]}
}

test_non_k8s_yaml_is_allowed if {
	infrastructure.allow with input as {"files": ["README.yaml"]}
}
