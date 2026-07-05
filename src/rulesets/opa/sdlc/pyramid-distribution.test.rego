package evolith.sdlc.pyramid_test

import data.evolith.sdlc.pyramid

test_perfect_distribution_is_allowed {
	pyramid.allow with input as {"unit_pct": 70, "integration_pct": 20, "e2e_pct": 10}
}

test_within_tolerance_is_allowed {
	pyramid.allow with input as {"unit_pct": 75, "integration_pct": 15, "e2e_pct": 10}
}

test_at_tolerance_boundary_is_allowed {
	pyramid.allow with input as {"unit_pct": 80, "integration_pct": 10, "e2e_pct": 10}
}

test_beyond_tolerance_is_not_allowed {
	not pyramid.allow with input as {"unit_pct": 90, "integration_pct": 5, "e2e_pct": 5}
}

test_all_zero_is_not_allowed {
	not pyramid.allow with input as {"unit_pct": 0, "integration_pct": 0, "e2e_pct": 0}
}

test_violations_produced_when_out_of_tolerance {
	violations := pyramid.violations with input as {"unit_pct": 95, "integration_pct": 3, "e2e_pct": 2}
	count(violations) > 0
}

test_no_violations_when_valid {
	violations := pyramid.violations with input as {"unit_pct": 70, "integration_pct": 20, "e2e_pct": 10}
	count(violations) == 0
}
