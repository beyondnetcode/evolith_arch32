package evolith.hexagonal_architecture

violations[{"id": "HXA-01", "message": "Core (Domain) layer has framework imports — must be pure TypeScript only"}] {
    input.satellite.layers.core.hasFrameworkImports
}

violations[{"id": "HXA-02", "message": "Application layer has infrastructure imports — may import Core and NestJS DI only"}] {
    input.satellite.layers.application.hasInfrastructureImports
}

violations[{"id": "HXA-03", "message": "Infrastructure layer does not implement Core port interfaces"}] {
    not input.satellite.layers.infrastructure.implementsPorts
}

violations[{"id": "HXA-04", "message": "Dependency direction violated — backward imports detected"}] {
    input.satellite.layers.hasBackwardImports
}

violations[{"id": "HXA-05", "message": "AOP concerns found in Core/Application layers — prohibited"}] {
    input.satellite.layers.core.hasAopDecorators
}

violations[{"id": "HXA-05", "message": "AOP concerns found in Core/Application layers — prohibited"}] {
    input.satellite.layers.application.hasAopDecorators
}

violations[{"id": "HXA-07", "message": "Core domain tests require framework bootstrap — must run without framework"}] {
    input.satellite.layers.core.domainTestsRequireBootstrap
}
