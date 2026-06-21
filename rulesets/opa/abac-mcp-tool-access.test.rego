package evolith.abac_test

import data.evolith.abac

test_architect_can_deploy_in_production {
  violations := abac.violations with input as {"user": {"id": "arch-1", "roles": ["architect"], "tenant": "evolith"}, "tool_name": "evolith-deploy", "resource_domain": "core", "environment": "production"}
  count(violations) == 0
}

test_viewer_cannot_write {
  violations := abac.violations with input as {"user": {"id": "viewer-1", "roles": ["viewer"], "tenant": "evolith"}, "tool_name": "evolith-write-file", "resource_domain": "core", "environment": "production"}
  violations[_].id == "ABAC-01"
}

test_empty_roles_is_rejected {
  violations := abac.violations with input as {"user": {"id": "anon", "roles": [], "tenant": "evolith"}, "tool_name": "evolith-ping", "resource_domain": "core", "environment": "production"}
  violations[_].id == "ABAC-02"
}

test_unknown_tool_is_rejected {
  violations := abac.violations with input as {"user": {"id": "arch-1", "roles": ["architect"], "tenant": "evolith"}, "tool_name": "evolith-unknown-tool", "resource_domain": "core", "environment": "production"}
  violations[_].id == "ABAC-03"
}

test_developer_can_write_in_non_production {
  violations := abac.violations with input as {"user": {"id": "dev-1", "roles": ["developer"], "tenant": "evolith"}, "tool_name": "evolith-write-file", "resource_domain": "core", "environment": "staging"}
  count(violations) == 0
}

test_operator_cannot_deploy_in_production {
  violations := abac.violations with input as {"user": {"id": "op-1", "roles": ["operator"], "tenant": "evolith"}, "tool_name": "evolith-deploy", "resource_domain": "core", "environment": "production"}
  violations[_].id == "ABAC-01"
}
