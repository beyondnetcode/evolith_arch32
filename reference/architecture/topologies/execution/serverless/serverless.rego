package evolith.architecture.serverless

default allow := false

# SV-R01: Serverless configuration
deny[{"id": "SV-R01", "msg": "El satélite debe declarar explícitamente su manifiesto de ejecución serverless (serverless.yml, template.yaml o samconfig.toml)"}] {
    not input.satellite.hasServerlessConfig
}

allow {
    count(deny) == 0
}
