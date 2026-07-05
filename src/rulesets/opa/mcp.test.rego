package evolith.mcp_test

import data.evolith.mcp

test_complete_mcp_has_no_violations {
  input := {"core": {"cli": {"mcpServerSource": "apiKey localhost metrics latency counter"}, "evidence": {"mcp-smoke.json": {"results": {"initialize": {}, "tools/list": {}, "resources/list": {}}, "status": "passed"}}}}
  violations := mcp.violations with input as input
  count(violations) == 0
}

test_missing_mcp_evidence_is_rejected {
  input := {"core": {"cli": {"mcpServerSource": ""}, "evidence": {}}}
  violations := mcp.violations with input as input
  violations[_].id == "MCP-01"
}

test_missing_server_source_is_rejected {
  input := {"core": {"cli": {"mcpServerSource": ""}, "evidence": {"mcp-smoke.json": {"results": {"initialize": {}, "tools/list": {}, "resources/list": {}}, "status": "passed"}}}}
  violations := mcp.violations with input as input
  violations[_].id == "MCP-04"
}

test_missing_resources_list_is_rejected {
  input := {"core": {"cli": {"mcpServerSource": "apiKey"}, "evidence": {"mcp-smoke.json": {"results": {"initialize": {}, "tools/list": {}}, "status": "passed"}}}}
  violations := mcp.violations with input as input
  violations[_].id == "MCP-03"
}
