package evolith.version_pinning

# Define a set of violations.
# A violation is an object with a rule `id` and a `message`.
violations[{"id": "DEP-01", "message": msg}] {
    # Check satellite package.json
    deps := input.satellite.packageJson.dependencies
    some pkg
    version := deps[pkg]
    startswith(version, "^")
    msg := sprintf("package.json#dependencies.%v=%v (Caret pinning not allowed)", [pkg, version])
}

violations[{"id": "DEP-02", "message": msg}] {
    deps := input.satellite.packageJson.dependencies
    some pkg
    version := deps[pkg]
    startswith(version, "~")
    msg := sprintf("package.json#dependencies.%v=%v (Tilde pinning not allowed)", [pkg, version])
}

violations[{"id": "DEP-03", "message": msg}] {
    deps := input.satellite.packageJson.dependencies
    some pkg
    version := deps[pkg]
    disallowed := {"*", "latest", "x", "X", ""}
    disallowed[version]
    msg := sprintf("package.json#dependencies.%v=%v (Wildcard/Latest pinning not allowed)", [pkg, version])
}

# Also check devDependencies
violations[{"id": "DEP-01", "message": msg}] {
    deps := input.satellite.packageJson.devDependencies
    some pkg
    version := deps[pkg]
    startswith(version, "^")
    msg := sprintf("package.json#devDependencies.%v=%v (Caret pinning not allowed)", [pkg, version])
}

violations[{"id": "DEP-02", "message": msg}] {
    deps := input.satellite.packageJson.devDependencies
    some pkg
    version := deps[pkg]
    startswith(version, "~")
    msg := sprintf("package.json#devDependencies.%v=%v (Tilde pinning not allowed)", [pkg, version])
}

violations[{"id": "DEP-03", "message": msg}] {
    deps := input.satellite.packageJson.devDependencies
    some pkg
    version := deps[pkg]
    disallowed := {"*", "latest", "x", "X", ""}
    disallowed[version]
    msg := sprintf("package.json#devDependencies.%v=%v (Wildcard/Latest pinning not allowed)", [pkg, version])
}
