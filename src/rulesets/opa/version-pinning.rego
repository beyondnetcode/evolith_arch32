package evolith.version_pinning

import rego.v1

# Define a set of violations.
# A violation is an object with a rule `id` and a `message`.
violations contains {"id": "DEP-01", "message": msg} if {
	# Check satellite package.json
	deps := input.satellite.packageJson.dependencies
	some pkg
	version := deps[pkg]
	startswith(version, "^")
	msg := sprintf("package.json#dependencies.%v=%v (Caret pinning not allowed)", [pkg, version])
}

violations contains {"id": "DEP-02", "message": msg} if {
	deps := input.satellite.packageJson.dependencies
	some pkg
	version := deps[pkg]
	startswith(version, "~")
	msg := sprintf("package.json#dependencies.%v=%v (Tilde pinning not allowed)", [pkg, version])
}

violations contains {"id": "DEP-03", "message": msg} if {
	deps := input.satellite.packageJson.dependencies
	some pkg
	version := deps[pkg]
	disallowed := {"*", "latest", "x", "X", ""}
	disallowed[version]
	msg := sprintf("package.json#dependencies.%v=%v (Wildcard/Latest pinning not allowed)", [pkg, version])
}

# Also check devDependencies
violations contains {"id": "DEP-01", "message": msg} if {
	deps := input.satellite.packageJson.devDependencies
	some pkg
	version := deps[pkg]
	startswith(version, "^")
	msg := sprintf("package.json#devDependencies.%v=%v (Caret pinning not allowed)", [pkg, version])
}

violations contains {"id": "DEP-02", "message": msg} if {
	deps := input.satellite.packageJson.devDependencies
	some pkg
	version := deps[pkg]
	startswith(version, "~")
	msg := sprintf("package.json#devDependencies.%v=%v (Tilde pinning not allowed)", [pkg, version])
}

violations contains {"id": "DEP-03", "message": msg} if {
	deps := input.satellite.packageJson.devDependencies
	some pkg
	version := deps[pkg]
	disallowed := {"*", "latest", "x", "X", ""}
	disallowed[version]
	msg := sprintf("package.json#devDependencies.%v=%v (Wildcard/Latest pinning not allowed)", [pkg, version])
}

# DEP-10 applies to all packages in the workspace
violations contains {"id": "DEP-10", "message": msg} if {
	ws := input.satellite.workspacePackageJsons[_]
	deps := ws.content.dependencies
	some pkg
	version := deps[pkg]
	startswith(version, "^")
	msg := sprintf("%v#dependencies.%v=%v", [ws.path, pkg, version])
}

violations contains {"id": "DEP-10", "message": msg} if {
	ws := input.satellite.workspacePackageJsons[_]
	deps := ws.content.devDependencies
	some pkg
	version := deps[pkg]
	startswith(version, "^")
	msg := sprintf("%v#devDependencies.%v=%v", [ws.path, pkg, version])
}

violations contains {"id": "DEP-10", "message": msg} if {
	ws := input.satellite.workspacePackageJsons[_]
	deps := ws.content.dependencies
	some pkg
	version := deps[pkg]
	startswith(version, "~")
	msg := sprintf("%v#dependencies.%v=%v", [ws.path, pkg, version])
}

violations contains {"id": "DEP-10", "message": msg} if {
	ws := input.satellite.workspacePackageJsons[_]
	deps := ws.content.devDependencies
	some pkg
	version := deps[pkg]
	startswith(version, "~")
	msg := sprintf("%v#devDependencies.%v=%v", [ws.path, pkg, version])
}

violations contains {"id": "DEP-08", "message": msg} if {
	overrides := input.satellite.packageJson.overrides
	count(overrides) > 0
	not input.satellite.overridesRationaleDocumented
	msg := sprintf("package.json 'overrides' section has %d entries without a companion overrides-rationale.json — each override must document the CVE or compatibility reason", [count(overrides)])
}
