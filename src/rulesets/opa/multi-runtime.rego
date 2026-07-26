package evolith.multi_runtime

import rego.v1

violations contains {"id": "RUNT-01", "message": "Runtime selection not documented or justified by workload profile"} if {
	not input.satellite.runtime.selectionDocumented
}

violations contains {"id": "RUNT-02", "message": "Web APIs/BFF not using Node.js/TypeScript — required for I/O-bound workloads"} if {
	input.satellite.runtime.webApisNotNodeJs
}

violations contains {"id": "RUNT-03", "message": "High compute/batch workloads not using .NET (C#) — required for compute-bound workloads"} if {
	input.satellite.runtime.highComputeNotDotNet
}

violations contains {"id": "RUNT-05", "message": "Direct runtime dependency detected — cross-runtime calls must go through protocol boundaries"} if {
	input.satellite.runtime.hasDirectRuntimeDependency
}

violations contains {"id": "RUNT-06", "message": "Synchronous inter-runtime communication not using gRPC"} if {
	input.satellite.runtime.syncInteropNotGrpc
}

violations contains {"id": "RUNT-04", "message": "Mobile workloads with hardware access (camera, GPS, sensors) must use Android/Kotlin — not cross-platform web wrappers"} if {
	input.satellite.runtime.mobileHardwareNotKotlin
}

violations contains {"id": "RUNT-07", "message": "Asynchronous inter-runtime communication must use a message broker (Kafka, RabbitMQ, NATS) — direct async calls between runtimes are prohibited"} if {
	input.satellite.runtime.asyncInteropNotMessageBroker
}

violations contains {"id": "RUNT-08", "message": "Inter-runtime contracts not centrally stored and versioned"} if {
	not input.satellite.runtime.contractsCentralized
}
