package evolith.engineering_manifesto

violations[{"id": "EM-S-01", "message": msg}] {
    input.classLineCount > 200
    msg := sprintf("Class exceeds 200 lines (%d lines found)", [input.classLineCount])
}

violations[{"id": "EM-S-03", "message": msg}] {
    input.liskovViolations > 0
    msg := sprintf("Liskov Substitution violations detected (%d found)", [input.liskovViolations])
}

violations[{"id": "EM-S-05", "message": "Domain layer must not import Infrastructure layer"}] {
    input.domainImportsInfrastructure
}

violations[{"id": "EM-K-01", "message": msg}] {
    input.maxCyclomaticComplexity > 15
    msg := sprintf("Cyclomatic complexity exceeds 15 (found %d)", [input.maxCyclomaticComplexity])
}

violations[{"id": "AP-01", "message": msg}] {
    input.classLineCount > 500
    msg := sprintf("God class detected: %d lines exceeds 500-line threshold", [input.classLineCount])
}

violations[{"id": "AP-01", "message": msg}] {
    input.classMethodCount > 20
    msg := sprintf("God class detected: %d methods exceeds 20-method threshold", [input.classMethodCount])
}

violations[{"id": "AP-02", "message": "Circular dependency detected"}] {
    input.circularDependencies
}

violations[{"id": "AP-03", "message": msg}] {
    input.shotgunSurgerySignals > 0
    msg := sprintf("Shotgun Surgery detected: one change requires modifying %d different classes (%d signals found)", [input.shotgunSurgeryClassCount, input.shotgunSurgerySignals])
}

violations[{"id": "AP-04", "message": msg}] {
    input.spaghettiCodeSignals > 0
    msg := sprintf("Spaghetti Code detected: complex nested control structures found (%d signals)", [input.spaghettiCodeSignals])
}

violations[{"id": "AP-05", "message": msg}] {
    input.magicNumbersCount > 0
    msg := sprintf("Magic numbers detected (%d found)", [input.magicNumbersCount])
}

violations[{"id": "EM-S-02", "message": "Open/Closed Principle violated — class modified directly for new behavior instead of extending via interface or inheritance"}] {
    input.openClosedViolations > 0
}

violations[{"id": "EM-S-04", "message": msg}] {
    input.interfaceSegregationViolations > 0
    msg := sprintf("Interface Segregation violated: %d fat interfaces found with methods unused by implementing classes", [input.interfaceSegregationViolations])
}

violations[{"id": "EM-D-01", "message": msg}] {
    input.duplicateCodeRatio > 5
    msg := sprintf("DRY violation: duplicate code ratio is %v%% (threshold: 5%%)", [input.duplicateCodeRatio])
}

violations[{"id": "EM-D-02", "message": msg}] {
    input.duplicateConfigCount > 0
    msg := sprintf("Configuration duplication detected: %d configuration values hardcoded in multiple locations", [input.duplicateConfigCount])
}

violations[{"id": "EM-K-02", "message": msg}] {
    input.prematureAbstractionSignals > 0
    msg := sprintf("Premature abstraction detected: %d abstractions with only one concrete use", [input.prematureAbstractionSignals])
}

violations[{"id": "EM-Y-01", "message": msg}] {
    input.yagniViolations > 0
    msg := sprintf("YAGNI violation: %d unused features or abstractions implemented ahead of actual need", [input.yagniViolations])
}
