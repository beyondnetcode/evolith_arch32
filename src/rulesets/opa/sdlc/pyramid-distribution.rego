package evolith.sdlc.pyramid

import rego.v1

# Gate F4 — Pyramid Distribution
# Target: 70% unit / 20% integration / 10% E2E
# Acceptable deviation: +/- 10 percentage points per tier

target_unit := 70

target_integration := 20

target_e2e := 10

tolerance := 10

violations contains msg if {
	abs(input.unit_pct - target_unit) > tolerance
	msg := sprintf("Unit distribution off by %dpp (got %d%%, target %d%%)", [abs(input.unit_pct - target_unit), input.unit_pct, target_unit])
}

violations contains msg if {
	abs(input.integration_pct - target_integration) > tolerance
	msg := sprintf("Integration distribution off by %dpp (got %d%%, target %d%%)", [abs(input.integration_pct - target_integration), input.integration_pct, target_integration])
}

violations contains msg if {
	abs(input.e2e_pct - target_e2e) > tolerance
	msg := sprintf("E2E distribution off by %dpp (got %d%%, target %d%%)", [abs(input.e2e_pct - target_e2e), input.e2e_pct, target_e2e])
}

default allow := false

allow if {
	count(violations) == 0
}
