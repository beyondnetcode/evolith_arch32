package evolith.sdlc.coverage_test

import data.evolith.sdlc.coverage

test_coverage_above_threshold_is_allowed {
	coverage.allow with input as {"coverage_percentage": 85}
}

test_coverage_at_threshold_is_allowed {
	coverage.allow with input as {"coverage_percentage": 80}
}

test_coverage_below_threshold_is_not_allowed {
	not coverage.allow with input as {"coverage_percentage": 75}
}

test_coverage_zero_is_not_allowed {
	not coverage.allow with input as {"coverage_percentage": 0}
}

test_violations_produced_when_below_threshold {
	violations := coverage.violations with input as {"coverage_percentage": 50}
	count(violations) > 0
}

test_no_violations_when_above_threshold {
	violations := coverage.violations with input as {"coverage_percentage": 90}
	count(violations) == 0
}
