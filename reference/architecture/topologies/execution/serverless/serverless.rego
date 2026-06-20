package evolith.topologies.serverless

violations[{"id":"SV-R01","blocking":true,"message":"serverless.config.json is required (SV-R01)."}] { not input.satellite.serverless.hasContract }
violations[{"id":"SV-R02","blocking":true,"message":"Serverless execution must be stateless (SV-R02)."}] { not input.satellite.serverless.isStateless }
violations[{"id":"SV-R03","blocking":true,"message":"Package size must be positive and no greater than 50 MB (SV-R03)."}] { not input.satellite.serverless.hasBoundedPackage }
violations[{"id":"SV-R04","blocking":true,"message":"Cold-start limits and lazy initialization are required (SV-R04)."}] { not input.satellite.serverless.hasColdStartReadiness }
