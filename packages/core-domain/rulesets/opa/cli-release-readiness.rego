package evolith.cli_release_readiness

violations[{"id": "CLI-RR-01", "message": "TypeScript build does not pass — npm run build must exit 0 before release"}] {
    not input.satellite.releaseReadiness.buildPasses
}

violations[{"id": "CLI-RR-02", "message": "Unit and integration tests do not pass — npm test must exit 0 before release"}] {
    not input.satellite.releaseReadiness.testsPass
}

violations[{"id": "CLI-RR-03", "message": "Dependency graph not reproducible — package-lock.json missing or transitive dependencies broken"}] {
    not input.satellite.releaseReadiness.lockFilePresent
}

violations[{"id": "CLI-RR-04", "message": "MCP smoke test does not pass — initialize and tools/list must respond over release transport"}] {
    not input.satellite.releaseReadiness.mcpSmokePasses
}

violations[{"id": "CLI-RR-05", "message": "Release documentation does not match implementation — README exists but describes outdated state"}] {
    not input.satellite.releaseReadiness.readmeExists
}
