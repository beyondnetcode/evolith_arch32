package evolith.mcp

smoke_keys := [k | input.core.evidence[k]; contains(k, "mcp")]

violations[{"id": "MCP-01", "message": "Run .harness/scripts/mcp-smoke.mjs to generate evidence"}] {
    count(smoke_keys) == 0
}

violations[{"id": "MCP-02", "message": "Run .harness/scripts/mcp-smoke.mjs to generate evidence"}] {
    count(smoke_keys) == 0
}

violations[{"id": "MCP-03", "message": "Run .harness/scripts/mcp-smoke.mjs to generate evidence"}] {
    count(smoke_keys) == 0
}

violations[{"id": "MCP-01", "message": "Evidence missing results field"}] {
    count(smoke_keys) > 0
    smoke := input.core.evidence[smoke_keys[0]]
    not smoke.results
}

violations[{"id": "MCP-01", "message": "initialize response missing from evidence"}] {
    count(smoke_keys) > 0
    smoke := input.core.evidence[smoke_keys[0]]
    smoke.results
    not smoke.results["initialize"]
}

violations[{"id": "MCP-02", "message": "tools/list response missing from evidence"}] {
    count(smoke_keys) > 0
    smoke := input.core.evidence[smoke_keys[0]]
    smoke.results
    not smoke.results["tools/list"]
}

violations[{"id": "MCP-03", "message": "resources/list response missing from evidence"}] {
    count(smoke_keys) > 0
    smoke := input.core.evidence[smoke_keys[0]]
    smoke.results
    not smoke.results["resources/list"]
}

violations[{"id": "MCP-04", "message": "MCP server.ts not found"}] {
    not input.core.cli.mcpServerSource
}

violations[{"id": "MCP-04", "message": "MCP transport config missing apiKey or local-only restriction"}] {
    src := input.core.cli.mcpServerSource
    not contains(src, "apiKey")
    not contains(src, "local-only")
    not contains(src, "localhost")
}

violations[{"id": "MCP-05", "message": "MCP tool calls SHOULD emit latency, success, failure, and error class metrics — no metrics instrumentation detected in MCP server source"}] {
    src := input.core.cli.mcpServerSource
    not contains(src, "latency")
    not contains(src, "metrics")
    not contains(src, "histogram")
    not contains(src, "counter")
}
