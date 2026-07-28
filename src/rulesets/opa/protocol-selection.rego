package evolith.protocol_selection

import rego.v1

violations contains {"id": "PROT-01", "message": "Internal service-to-service communication not using gRPC"} if {
	input.satellite.protocol.internalServiceCallsNotGrpc
}

violations contains {"id": "PROT-02", "message": "Public/external API not using REST"} if {
	input.satellite.protocol.publicApiNotRest
}

violations contains {"id": "PROT-04", "message": "GraphQL resolvers found in Core or Application layer — must be BFF only"} if {
	input.satellite.protocol.graphqlInDomainLayer
}

violations contains {"id": "PROT-05", "message": "Proto files not centralized in shared Contracts library"} if {
	not input.satellite.protocol.protoCentralized
}

violations contains {"id": "PROT-03", "message": "BFF must use REST as primary protocol. If GraphQL is used, it must be targeted only (not as general-purpose BFF API)"} if {
	input.satellite.protocol.bffUsesGraphqlAsGeneral
}

violations contains {"id": "PROT-06", "message": "File uploads and stream operations should prefer gRPC streaming over multipart REST — use gRPC for large binary payloads"} if {
	input.satellite.protocol.fileUploadsNotGrpc
}

violations contains {"id": "PROT-07", "message": "Breaking contract changes without version bump detected"} if {
	input.satellite.protocol.breakingChangesWithoutVersionBump
}
