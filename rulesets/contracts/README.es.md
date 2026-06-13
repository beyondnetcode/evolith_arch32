# Compatibilidad de Contratos de Máquina de Evolith

> **Navegación Bilingüe:** [English Version](./README.md)

El manifiesto de este directorio es el límite canónico de compatibilidad entre Evolith Core, el productor Smart CLI y consumidores independientes como Evolith Tracker.

- Las versiones del contrato y los schemas siguen versionado semántico.
- Los cambios aditivos compatibles incrementan la versión minor.
- Los cambios incompatibles incrementan la versión major y requieren una migración explícita del consumidor.
- Los consumidores fijan la versión del contrato, cada versión de schema y su digest SHA-256.
- El CI de Core valida la declaración del productor y los digests de schemas. El CI del consumidor ejecuta el mismo validador contra su manifiesto fijado.

Ejecutar:

```bash
node .harness/scripts/validate-contract-conformance.mjs
node .harness/scripts/validate-contract-conformance.mjs --consumer /ruta/a/consumer-contracts.json
```

