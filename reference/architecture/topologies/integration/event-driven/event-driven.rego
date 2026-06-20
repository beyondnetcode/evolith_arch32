package evolith.topologies.eventdriven

violations[{"id":"ED-R01","blocking":true,"message":"event-driven.config.json must declare strictAsyncApi=true (ED-R01)."}] { not input.satellite.eventDriven.hasStrictAsyncApi }
violations[{"id":"ED-R02","blocking":true,"message":"event-driven.config.json must declare transactionalOutbox=true (ED-R02)."}] { not input.satellite.eventDriven.hasOutbox }
violations[{"id":"ED-R03","blocking":true,"message":"event-driven.config.json must declare deadLetterQueue=true (ED-R03)."}] { not input.satellite.eventDriven.hasDlq }
