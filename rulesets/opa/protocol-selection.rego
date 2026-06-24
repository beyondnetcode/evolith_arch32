package evolith.protocol_selection

violations[{"id": "PROT-01", "message": "Internal service-to-service communication not using gRPC"}] {
    input.satellite.protocol.internalServiceCallsNotGrpc
}

violations[{"id": "PROT-02", "message": "Public/external API not using REST"}] {
    input.satellite.protocol.publicApiNotRest
}

violations[{"id": "PROT-04", "message": "GraphQL resolvers found in Core or Application layer — must be BFF only"}] {
    input.satellite.protocol.graphqlInDomainLayer
}

violations[{"id": "PROT-05", "message": "Proto files not centralized in shared Contracts library"}] {
    not input.satellite.protocol.protoCentralized
}

violations[{"id": "PROT-07", "message": "Breaking contract changes without version bump detected"}] {
    input.satellite.protocol.breakingChangesWithoutVersionBump
}
