# GT-580 — the CLI exit-code taxonomy, as policy.
#
# Rego parity for `src/rulesets/cli/exit-code-taxonomy.rules.json`: the same three
# rule ids, the same verdicts, evaluated over the fact document produced by
# `src/sdk/cli/scripts/exit-code-taxonomy-facts.mjs --json` and mounted at
# `input.core.cli.exitCodes`.
#
# The policy deliberately does NOT re-implement the file scan. A policy that
# walked a source tree would be a second scanner drifting away from the first;
# facts in, verdict out is the whole point of keeping the producer separate.
#
# Published taxonomy: 0 pass · 1 tool failure · 2 blocked · 3 invalid input.
package evolith.cli_exit_code_taxonomy

import rego.v1

facts := input.core.cli.exitCodes

# CLI-EXIT-01 — a command that exits outside the taxonomy fails the gate.
#
# One violation per offender, so the message names the file and the literal
# rather than reporting an anonymous count somebody then has to go hunting for.
violations contains {
	"id": "CLI-EXIT-01",
	"message": sprintf(
		"%s exits with %d, which is outside the published CLI exit-code taxonomy {0,1,2,3} (%s)",
		[offender.file, offender.code, offender.snippet],
	),
} if {
	some offender in facts.offenders
}

# CLI-EXIT-02 — a scan that read nothing is not compliance.
#
# Without this, a moved source root turns CLI-EXIT-01 into a rule that can never
# fire: no files scanned means no offenders found, and the gate reports green
# over an empty directory.
violations contains {
	"id": "CLI-EXIT-02",
	"message": sprintf(
		"the exit-code taxonomy scan covered %d CLI sources — a scan that reads nothing finds no offenders, which is not compliance",
		[facts.scanned],
	),
} if {
	facts.scanned == 0
}

# CLI-EXIT-03 — the taxonomy itself may not be widened.
#
# The cheap way to make CLI-EXIT-01 green is to declare the offending code part
# of the taxonomy. That makes the consumer's problem worse, not better, so it
# fails here instead of passing silently.
violations contains {
	"id": "CLI-EXIT-03",
	"message": sprintf(
		"the CLI declares exit codes %v; the published taxonomy is exactly [0, 1, 2, 3] and widening it is a governance decision, not a fix",
		[facts.declared],
	),
} if {
	facts.declared != [0, 1, 2, 3]
}

# Absence of facts is not compliance either: a consumer that forgot to attach the
# fact document must not read as a pass.
#
# Scoped to `input.core.cli` on purpose. This ruleset is `audience: core` — it
# addresses the Evolith monorepo's own CLI — and `main.rego` aggregates it, so an
# unscoped rule would fire on every satellite evaluation, where the CLI source
# tree does not exist and the fact document is meaningless. Declaring
# `input.core.cli` is the caller saying "I am evaluating the Core CLI"; having
# said it, omitting the facts is a defect rather than a non-applicable rule.
violations contains {
	"id": "CLI-EXIT-02",
	"message": "no exit-code taxonomy facts were supplied at input.core.cli.exitCodes — the rule cannot be evaluated, and an unevaluated blocking rule is not a pass",
} if {
	input.core.cli
	not input.core.cli.exitCodes
}
