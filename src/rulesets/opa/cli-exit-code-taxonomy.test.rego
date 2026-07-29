# GT-580 — executable tests for the CLI exit-code taxonomy policy.
#
# The negative cases are the point. A guard nobody has ever seen fail is not a
# guard, and this board has repeatedly caught exactly that. Each test below moves
# ONE field of a known-compliant fact document and names the rule it expects.
package evolith.cli_exit_code_taxonomy_test

import rego.v1

import data.evolith.cli_exit_code_taxonomy

# The real shape emitted by `exit-code-taxonomy-facts.mjs --json`, with the
# numbers measured against the CLI on 2026-07-29.
compliant_input := {"core": {"cli": {"exitCodes": {
	"schemaVersion": "1.0.0",
	"declared": [0, 1, 2, 3],
	"observed": [0, 1, 2, 3],
	"scanned": 152,
	"offenders": [],
	"compliant": true,
}}}}

test_compliant_cli_has_no_violations if {
	violations := cli_exit_code_taxonomy.violations with input as compliant_input
	count(violations) == 0
}

# The criterion, stated as a test: a command that exits outside {0,1,2,3} fails.
test_command_exiting_outside_the_taxonomy_is_rejected if {
	i := json.patch(compliant_input, [{
		"op": "replace",
		"path": "/core/cli/exitCodes/offenders",
		"value": [{"file": "commands/rogue/rogue.command.ts", "code": 7, "snippet": "process.exit(7)"}],
	}])
	violations := cli_exit_code_taxonomy.violations with input as i
	violations[_].id == "CLI-EXIT-01"
}

test_every_offender_is_named_individually if {
	i := json.patch(compliant_input, [{
		"op": "replace",
		"path": "/core/cli/exitCodes/offenders",
		"value": [
			{"file": "commands/rogue/a.command.ts", "code": 7, "snippet": "process.exit(7)"},
			{"file": "commands/rogue/b.command.ts", "code": 64, "snippet": "process.exitCode = 64"},
		],
	}])
	violations := cli_exit_code_taxonomy.violations with input as i
	count(violations) == 2
}

test_a_vacuous_scan_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/core/cli/exitCodes/scanned", "value": 0}])
	violations := cli_exit_code_taxonomy.violations with input as i
	violations[_].id == "CLI-EXIT-02"
}

test_missing_facts_are_rejected_rather_than_read_as_a_pass if {
	violations := cli_exit_code_taxonomy.violations with input as {"core": {"cli": {"mcpServerSource": "x"}}}
	violations[_].id == "CLI-EXIT-02"
}

# The mirror image, and the reason the rule above is scoped: `main.rego`
# aggregates this policy, so a satellite evaluation — which has no Core CLI tree
# and no fact document — must produce nothing at all rather than three blocking
# violations about a source tree it does not contain.
test_a_satellite_evaluation_is_silent if {
	violations := cli_exit_code_taxonomy.violations with input as {"satellite": {"contracts": {"phase": 2}}}
	count(violations) == 0
}

# The escape hatch: declaring 7 part of the taxonomy would silence CLI-EXIT-01.
# It must not silence the gate.
test_widening_the_taxonomy_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/core/cli/exitCodes/declared", "value": [0, 1, 2, 3, 7]}])
	violations := cli_exit_code_taxonomy.violations with input as i
	violations[_].id == "CLI-EXIT-03"
}
