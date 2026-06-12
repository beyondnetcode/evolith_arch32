package evolith.architecture

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Phase: F1 (Modular Monolith)
# ---------------------------------------------------------------------------

violations[{"id": "F1-R01", "severity": "MUST", "title": "Single Deployment Unit", "blocking": true, "msg": msg}] {
	input.satellite.packageJson.workspaces
	msg := "Monorepo workspace detected. All modules MUST compile into a single assembly/container image (F1-R01)."
}

violations[{"id": "F1-R02", "severity": "MUST", "title": "Explicit Bounded Context Boundaries", "blocking": true, "msg": msg}] {
	count(input.satellite.directories) < 2
	msg := "Found less than 2 modules in src/ (F1-R02)."
}

violations[{"id": "F1-R03", "severity": "MUST", "title": "Ports and Adapters Boundary", "blocking": true, "msg": msg}] {
	# Logic would verify domain layer dependencies - simplified via dir check as in Native
	not has_ports_dir(input.satellite.directories)
	msg := "No ports directory found (expected: src/ports or src/application/ports) (F1-R03)."
}

has_ports_dir(dirs) {
	dirs[_] == "ports"
}
has_ports_dir(dirs) {
	dirs[_] == "Ports"
}

violations[{"id": "F1-R04", "severity": "MUST", "title": "Inter-Context Communication via Ports", "blocking": true, "msg": msg}] {
	input.satellite.hasContracts == false
	msg := "No contracts/ directory found for inter-module contracts (F1-R04)."
}

violations[{"id": "F1-R05", "severity": "MUST", "title": "No Shared Database Across Bounded Contexts", "blocking": true, "msg": msg}] {
	input.satellite.hasAcl == false
	msg := "No acl/ directory found (should contain one subdirectory per bounded context) (F1-R05)."
}

violations[{"id": "F1-R06", "severity": "MUST", "title": "Async Events Use Domain Events", "blocking": false, "msg": msg}] {
	input.satellite.hasEvents == false
	msg := "No events directory found (F1-R06)."
}

violations[{"id": "F1-R07", "severity": "MUST", "title": "Maintain Extraction Readiness Score", "blocking": false, "msg": msg}] {
	# Logic would verify ADR-0045 score documentation
	# We skip full doc check in Rego, Native does it better, but for parity:
	not input.satellite.hasExtractionReadiness
	msg := "No extraction-readiness.md found in docs/ (F1-R07)."
}

violations[{"id": "F1-R08", "severity": "MUST", "title": "Observability Instrumentation", "blocking": false, "msg": msg}] {
	not input.satellite.hasOtel
	msg := "No OpenTelemetry instrumentation found (F1-R08)."
}

# ---------------------------------------------------------------------------
# New Architectural Harness Rules (CLI Refactoring Standards)
# ---------------------------------------------------------------------------

# F1-R09: Strict Dependency Inversion Principle (DIP)
violations[{"id": "F1-R09", "severity": "MUST", "title": "Strict Dependency Inversion Principle (DIP)", "blocking": true, "msg": msg}] {
	some i
	file := input.satellite.sourceFiles[i]
	
	# Exclude DI container setup files or tests
	not contains(file.path, ".spec.ts")
	not contains(file.path, ".test.ts")
	not contains(file.path, "app.module.ts")
	not contains(file.path, "registry.ts")

	# Use AST metadata provided by OpaInputBuilder
	file.hasManualInstantiation == true

	msg := sprintf("Manual instantiation of services detected in %s. Use Dependency Injection instead (F1-R09).", [file.path])
}

# F1-R10: AST-Based Code Analysis Mandatory
violations[{"id": "F1-R10", "severity": "MUST", "title": "AST-Based Code Analysis Mandatory", "blocking": true, "msg": msg}] {
	some i
	file := input.satellite.sourceFiles[i]
	
	# If the file is part of an analyzer or validator
	contains(file.path, "analyzer")
	not contains(file.path, ".spec.ts")
	
	# Check metadata provided by OpaInputBuilder
	file.hasAstImport == false
	file.usesRegexForCode == true
	
	msg := sprintf("Static analysis tool %s appears to use Regex instead of an AST parser like 'typescript' (F1-R10).", [file.path])
}

# F1-R11: Strict UI and Logic Isolation (SoC)
violations[{"id": "F1-R11", "severity": "MUST", "title": "Strict UI and Logic Isolation (SoC)", "blocking": true, "msg": msg}] {
	some i
	file := input.satellite.sourceFiles[i]
	
	# Ensure domain and application layers do not import UI or CLI tools
	is_logic_layer(file.path)
	
	file.hasUiImport == true

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
