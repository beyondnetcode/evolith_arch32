package evolith.capability_source_interface_test

import data.evolith.capability_source_interface

test_allowed_interface_has_no_violations {
	input_doc := {
		"capability": {"id": "validate-discovery-gate", "allowedSourceInterfaces": ["smart_cli_command", "mcp"]},
		"context": {"sourceInterface": "mcp"},
	}

	violations := capability_source_interface.violations with input as input_doc
	count(violations) == 0
	capability_source_interface.allow with input as input_doc
}

test_disallowed_interface_is_rejected {
	input_doc := {
		"capability": {"id": "validate-discovery-gate", "allowedSourceInterfaces": ["mcp"]},
		"context": {"sourceInterface": "smart_cli_chat"},
	}

	violations := capability_source_interface.violations with input as input_doc
	violations[_].id == "CSI-01"
	not capability_source_interface.allow with input as input_doc
}

test_absent_allowlist_keeps_legacy_allow {
	input_doc := {
		"capability": {"id": "validate-discovery-gate"},
		"context": {"sourceInterface": "smart_cli_chat"},
	}

	violations := capability_source_interface.violations with input as input_doc
	count(violations) == 0
	capability_source_interface.allow with input as input_doc
}

test_absent_source_interface_keeps_native_behavior {
	input_doc := {
		"capability": {"id": "validate-discovery-gate", "allowedSourceInterfaces": ["mcp"]},
		"context": {},
	}

	violations := capability_source_interface.violations with input as input_doc
	count(violations) == 0
	capability_source_interface.allow with input as input_doc
}
