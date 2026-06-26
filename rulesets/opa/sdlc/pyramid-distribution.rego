package evolith.sdlc.pyramid

# Gate F4 — Pyramid Distribution
# Target: 70% unit / 20% integration / 10% E2E
# Acceptable deviation: +/- 10 percentage points per tier

default valid = false

target_unit := 70
target_integration := 20
target_e2e := 10
tolerance := 10

valid if {
	abs(input.unit_pct - target_unit) <= tolerance
	abs(input.integration_pct - target_integration) <= tolerance
	abs(input.e2e_pct - target_e2e) <= tolerance
}

reason[msg] if {
	not valid
	parts := []
	parts := array.concat(parts, ["Unit distribution off by ", sprintf("%d", [abs(input.unit_pct - target_unit)]), "pp"]) if abs(input.unit_pct - target_unit) > tolerance
	msg := sprintf("Pyramid distribution out of tolerance: %s", [concat(", ", parts)])
}

evidence[msg] if {
	valid
	msg := sprintf("Pyramid distribution within tolerance: unit=%d%%, integration=%d%%, e2e=%d%%", [input.unit_pct, input.integration_pct, input.e2e_pct])
}
