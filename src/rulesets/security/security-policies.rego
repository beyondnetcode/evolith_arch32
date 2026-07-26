package evolith.governance.security

import rego.v1

# Default deny for security rules
default allow := false

# SEC-INJ-01: No shell exec with user input
allow if {
	input.rule_id == "SEC-INJ-01"
	input.has_exec_file_only == true
}

# SEC-INJ-02: Parameter allowlists for scaffold tools
allow if {
	input.rule_id == "SEC-INJ-02"
	input.has_allowlist_validation == true
}

# SEC-PATH-01: Path input sanitization
allow if {
	input.rule_id == "SEC-PATH-01"
	input.has_path_sanitization == true
}

# SEC-PATH-02: Base directory containment
allow if {
	input.rule_id == "SEC-PATH-02"
	input.path_within_base_dir == true
}

# SEC-TIMING-01: Constant-time credential comparison
allow if {
	input.rule_id == "SEC-TIMING-01"
	input.uses_timing_safe_equal == true
}

# SEC-TIMING-02: No early rejection on credential length
allow if {
	input.rule_id == "SEC-TIMING-02"
	input.no_length_early_reject == true
}

# SEC-RL-01: Rate limiting on HTTP endpoints
allow if {
	input.rule_id == "SEC-RL-01"
	input.has_rate_limiting == true
}

# SEC-RL-02: Request body size limits
allow if {
	input.rule_id == "SEC-RL-02"
	input.has_body_size_limit == true
}

# SEC-RL-03: HTTP server timeouts (SHOULD, not MUST)
allow if {
	input.rule_id == "SEC-RL-03"
	input.has_http_timeout == true
}
