package evolith.multi_runtime

violations[{"id": "RUNT-01", "message": "Runtime selection not documented or justified by workload profile"}] {
    not input.satellite.runtime.selectionDocumented
}

violations[{"id": "RUNT-02", "message": "Web APIs/BFF not using Node.js/TypeScript — required for I/O-bound workloads"}] {
    input.satellite.runtime.webApisNotNodeJs
}

violations[{"id": "RUNT-03", "message": "High compute/batch workloads not using .NET (C#) — required for compute-bound workloads"}] {
    input.satellite.runtime.highComputeNotDotNet
}

violations[{"id": "RUNT-05", "message": "Direct runtime dependency detected — cross-runtime calls must go through protocol boundaries"}] {
    input.satellite.runtime.hasDirectRuntimeDependency
}

violations[{"id": "RUNT-06", "message": "Synchronous inter-runtime communication not using gRPC"}] {
    input.satellite.runtime.syncInteropNotGrpc
}

violations[{"id": "RUNT-08", "message": "Inter-runtime contracts not centrally stored and versioned"}] {
    not input.satellite.runtime.contractsCentralized
}
