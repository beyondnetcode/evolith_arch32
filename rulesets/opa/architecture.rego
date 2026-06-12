package evolith.architecture

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Phase: F1 (Modular Monolith)
# ---------------------------------------------------------------------------

# F1-R01 to F1-R08 (Placeholders for Native Engine logic, to be evaluated if needed by OPA)
violations[{"id": "F1-R01", "severity": "MUST", "title": "Single Deployment Unit", "blocking": true, "msg": msg}] {
	# Logic would verify deployment artifacts
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R02", "severity": "MUST", "title": "Explicit Bounded Context Boundaries", "blocking": true, "msg": msg}] {
	# Logic would verify cross-context persistence coupling
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R03", "severity": "MUST", "title": "Ports and Adapters Boundary", "blocking": true, "msg": msg}] {
	# Logic would verify domain layer dependencies
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R04", "severity": "MUST", "title": "Inter-Context Communication via Ports", "blocking": true, "msg": msg}] {
	# Logic would verify infrastructure imports across boundaries
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R05", "severity": "MUST", "title": "No Shared Database Across Bounded Contexts", "blocking": true, "msg": msg}] {
	# Logic would verify database instances/schemas per context
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R06", "severity": "MUST", "title": "Async Events Use Domain Events", "blocking": false, "msg": msg}] {
	# Logic would verify event subscriptions
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R07", "severity": "MUST", "title": "Maintain Extraction Readiness Score", "blocking": false, "msg": msg}] {
	# Logic would verify ADR-0045 score documentation
	false
	msg := "Placeholder"
}

violations[{"id": "F1-R08", "severity": "MUST", "title": "Observability Instrumentation", "blocking": false, "msg": msg}] {
	# Logic would verify OTel tracing config
	false
	msg := "Placeholder"
}

# ---------------------------------------------------------------------------
# New Architectural Harness Rules (CLI Refactoring Standards)
# ---------------------------------------------------------------------------

# F1-R09: Strict Dependency Inversion Principle (DIP)
violations[{"id": "F1-R09", "severity": "MUST", "title": "Strict Dependency Inversion Principle (DIP)", "blocking": true, "msg": msg}] {
	some i, j
	file := input.source_files[i]
	
	# Look for manual instantiation of known service patterns
	contains(file.content, "new ")
	regex.match(`new\s+[A-Z][a-zA-Z0-9]*(Service|UseCase|Repository|Adapter)\s*\(`, file.content)
	
	# Exclude DI container setup files or tests
	not contains(file.path, ".spec.ts")
	not contains(file.path, ".test.ts")
	not contains(file.path, "app.module.ts")
	not contains(file.path, "registry.ts")

	msg := sprintf("Manual instantiation of services detected in %s. Use Dependency Injection instead (F1-R09).", [file.path])
}

# F1-R10: AST-Based Code Analysis Mandatory
violations[{"id": "F1-R10", "severity": "MUST", "title": "AST-Based Code Analysis Mandatory", "blocking": true, "msg": msg}] {
	some i
	file := input.source_files[i]
	
	# If the file is part of an analyzer or validator
	contains(file.path, "analyzer")
	contains(file.path, ".ts")
	not contains(file.path, ".spec.ts")
	
	# Check for heavy regex usage for code parsing instead of AST
	regex.match(`(import|require)\s*\(\s*['"]typescript['"]\s*\)`, file.content) == false
	regex.match(`(import|require)\s*\(\s*['"]@babel/parser['"]\s*\)`, file.content) == false
	
	# If it's a code analysis file but doesn't use an AST parser, flag it
	contains(file.content, "Regex")
	
	msg := sprintf("Static analysis tool %s appears to use Regex instead of an AST parser like 'typescript' (F1-R10).", [file.path])
}

# F1-R11: Strict UI and Logic Isolation (SoC)
violations[{"id": "F1-R11", "severity": "MUST", "title": "Strict UI and Logic Isolation (SoC)", "blocking": true, "msg": msg}] {
	some i
	file := input.source_files[i]
	
	# Ensure domain and application layers do not import UI or CLI tools
	is_logic_layer(file.path)
	
	has_ui_import(file.content)

	msg := sprintf("UI/CLI library imported in application or domain logic layer %s (F1-R11).", [file.path])
}

is_logic_layer(path) {
	contains(path, "/domain/")
}

is_logic_layer(path) {
	contains(path, "/application/")
}

is_logic_layer(path) {
	contains(path, "/use-cases/")
}

has_ui_import(content) {
	contains(content, "@clack/prompts")
}

has_ui_import(content) {
	contains(content, "inquirer")
}

has_ui_import(content) {
	contains(content, "commander")
}
