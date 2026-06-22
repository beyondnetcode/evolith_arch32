package evolith.topologies.eventdriven

violations[{"id":"ED-R01","blocking":true,"message":"event-driven.config.json must declare strictAsyncApi=true (ED-R01)."}] { not input.satellite.eventDriven.hasStrictAsyncApi }
violations[{"id":"ED-R02","blocking":true,"message":"event-driven.config.json must declare transactionalOutbox=true (ED-R02)."}] { not input.satellite.eventDriven.hasOutbox }
violations[{"id":"ED-R03","blocking":true,"message":"event-driven.config.json must declare deadLetterQueue=true (ED-R03)."}] { not input.satellite.eventDriven.hasDlq }
violations[{"id":"ED-R04","blocking":true,"message":"event-driven.config.json must declare hasOrderingGuarantee=true (ED-R04)."}] { not input.satellite.eventDriven.hasOrderingGuarantee }
violations[{"id":"ED-R05","blocking":true,"message":"All event consumers must implement idempotency; event-driven.config.json must declare hasIdempotencyKey=true (ED-R05)."}] { not input.satellite.eventDriven.hasIdempotencyKey }
violations[{"id":"ED-R06","blocking":true,"message":"Event schemas must evolve in a backward-compatible manner; event-driven.config.json must declare hasBackwardCompatibleSchema=true (ED-R06)."}] { not input.satellite.eventDriven.hasBackwardCompatibleSchema }
violations[{"id":"ED-R07","blocking":false,"message":"event-driven.config.json must declare hasRetentionPolicy=true with an explicit retention window per topic (ED-R07)."}] { not input.satellite.eventDriven.hasRetentionPolicy }
violations[{"id":"ED-R08","blocking":false,"message":"All published events must carry CorrelationId and TraceId headers; event-driven.config.json must declare hasEventCorrelation=true (ED-R08)."}] { not input.satellite.eventDriven.hasEventCorrelation }
violations[{"id":"ED-R09","blocking":false,"message":"All consumers should register a named consumer group; event-driven.config.json should declare hasConsumerGroupRegistry=true (ED-R09)."}] { not input.satellite.eventDriven.hasConsumerGroupRegistry }
