package evolith.topologies.datamesh

violations[{"id":"DAM-R01","blocking":true,"message":"data-mesh.config.json must declare isDataProduct=true (DAM-R01)."}] { not input.satellite.dataMesh.isDataProduct }
violations[{"id":"DAM-R02","blocking":true,"message":"data-mesh.config.json must declare hasDataContracts=true (DAM-R02)."}] { not input.satellite.dataMesh.hasDataContracts }
violations[{"id":"DAM-R03","blocking":true,"message":"data-mesh.config.json must declare federatedGovernance=true (DAM-R03)."}] { not input.satellite.dataMesh.federatedGovernance }
violations[{"id":"DAM-R04","blocking":true,"message":"All data products must declare lineage tracking; data-mesh.config.json must declare hasLineageTracking=true (DAM-R04)."}] { not input.satellite.dataMesh.hasLineageTracking }
violations[{"id":"DAM-R05","blocking":true,"message":"data-mesh.config.json must declare hasRetentionPolicy=true with an explicit retention window per dataset (DAM-R05)."}] { not input.satellite.dataMesh.hasRetentionPolicy }
violations[{"id":"DAM-R06","blocking":true,"message":"All consumers must register explicit consumption contracts; data-mesh.config.json must declare hasConsumptionContracts=true (DAM-R06)."}] { not input.satellite.dataMesh.hasConsumptionContracts }
violations[{"id":"DAM-R07","blocking":false,"message":"Each data product must declare measurable quality SLOs; data-mesh.config.json must declare hasDataQualitySLO=true (DAM-R07)."}] { not input.satellite.dataMesh.hasDataQualitySLO }
violations[{"id":"DAM-R08","blocking":false,"message":"Data contract schema changes must maintain backward compatibility; data-mesh.config.json must declare hasBackwardCompatibleContracts=true (DAM-R08)."}] { not input.satellite.dataMesh.hasBackwardCompatibleContracts }
violations[{"id":"DAM-R09","blocking":false,"message":"All data products should register in a central data catalog; data-mesh.config.json should declare hasDiscoveryRegistration=true (DAM-R09)."}] { not input.satellite.dataMesh.hasDiscoveryRegistration }
