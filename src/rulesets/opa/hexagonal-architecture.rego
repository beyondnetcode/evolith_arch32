package evolith.hexagonal_architecture

import rego.v1

violations contains {"id": "HXA-01", "message": "Core (Domain) layer has framework imports — must be pure TypeScript only"} if {
	input.satellite.layers.core.hasFrameworkImports
}

violations contains {"id": "HXA-02", "message": "Application layer has infrastructure imports — may import Core and NestJS DI only"} if {
	input.satellite.layers.application.hasInfrastructureImports
}

violations contains {"id": "HXA-03", "message": "Infrastructure layer does not implement Core port interfaces"} if {
	not input.satellite.layers.infrastructure.implementsPorts
}

violations contains {"id": "HXA-04", "message": "Dependency direction violated — backward imports detected"} if {
	input.satellite.layers.hasBackwardImports
}

violations contains {"id": "HXA-05", "message": "AOP concerns found in Core/Application layers — prohibited"} if {
	input.satellite.layers.core.hasAopDecorators
}

violations contains {"id": "HXA-05", "message": "AOP concerns found in Core/Application layers — prohibited"} if {
	input.satellite.layers.application.hasAopDecorators
}

violations contains {"id": "HXA-06", "message": "AOP concerns (interceptors, decorators) must be implemented exclusively in Infrastructure layer — not in Core or Application"} if {
	input.satellite.layers.infrastructure.aopNotInInfrastructure
}

violations contains {"id": "HXA-07", "message": "Core domain tests require framework bootstrap — must run without framework"} if {
	input.satellite.layers.core.domainTestsRequireBootstrap
}
