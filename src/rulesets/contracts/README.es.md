# Compatibilidad de Contratos de Máquina de Evolith

> **Navegación Bilingüe:** [English Version](./README.md)

El manifiesto de este directorio es el límite canónico de compatibilidad entre Evolith Core, el productor Evolith CLI y consumidores independientes como Evolith Tracker.

- Las versiones del contrato y los schemas siguen versionado semántico.
- Los cambios aditivos compatibles incrementan la versión minor.
- Los cambios incompatibles incrementan la versión major y requieren una migración explícita del consumidor.
- Los consumidores fijan la versión del contrato, cada versión de schema y su digest SHA-256.
- El CI de Core valida la declaración del productor y los digests de schemas. El CI del consumidor ejecuta el mismo validador contra su manifiesto fijado.

Ejecutar:

```bash
node .harness/scripts/ci/10-validate-contract-conformance.mjs
node .harness/scripts/ci/10-validate-contract-conformance.mjs --consumer /ruta/a/consumer-contracts.json
node .harness/scripts/ci/10-validate-contract-conformance.mjs --consumer src/rulesets/contracts/fixtures/evolith-tracker-consumer.contract.json
```

## Schemas fijados

| Id de schema | Versión | Ruta | Qué gobierna |
| --- | --- | --- | --- |
| `gate-evidence` | 1.0.0 | `src/rulesets/schema/gate-evidence.schema.json` | La evidencia adjunta a una decisión de gate. |
| `output-envelope` | 1.0.0 | `src/rulesets/schema/output-envelope.schema.json` | El sobre de transporte ADR-0073 que devuelve toda superficie. |
| `evaluation-context` | 1.2.0 | `src/rulesets/schema/evaluation-context.schema.json` | La PETICIÓN de evaluación — lo que un consumidor envía a `POST /api/v1/evaluate`. |
| `evaluation-result` | 1.1.0 | `src/rulesets/schema/evaluation-result.schema.json` | La RESPUESTA de evaluación — el `EvaluationResult` canónico que viaja en `data`. |

Los dos últimos se añadieron por GT-573. Hasta entonces la petición y la respuesta de la integración insignia no tenían schema fijado en ningún lado del cable, y por eso el Core podía responder con un sobre distinto del que el consumidor enlazaba dejando ambos CI en verde.

Todo consumidor debe fijar los cuatro ids, cada uno en la versión y el SHA-256 aquí declarados, o `--consumer` falla con `Consumer does not pin schema: <id>`. El fixture commiteado `evolith-tracker-consumer.contract.json` es el snapshot de compatibilidad propiedad de Core usado por los comandos de evidencia; el repositorio vivo `beyondnetcode/evolith_tracker` sigue siendo dueño de su manifiesto en runtime.
