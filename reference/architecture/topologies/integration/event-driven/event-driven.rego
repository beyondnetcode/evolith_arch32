package evolith.architecture.eventdriven

default allow := false

# ED-R01: AsyncAPI configuration
deny[{"id": "ED-R01", "msg": "El satélite debe documentar o definir su contrato de eventos mediante AsyncAPI (asyncapi.yaml o asyncapi.json)"}] {
    not input.satellite.hasAsyncApiConfig
}

allow {
    count(deny) == 0
}
