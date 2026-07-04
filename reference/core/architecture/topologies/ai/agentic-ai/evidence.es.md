# Evidencia de Validacion de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./evidence.md)

## Comandos Reproducibles

Ejecuta estos comandos desde la raiz del repositorio:

```bash
node .harness/scripts/validate-topology-manifests.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/01-validate-docs.mjs
npm test -- --runInBand architecture-rule.handler.spec.ts
```

## Evidencia Esperada

El fixture valido satisface el contrato y AAI-R01 a AAI-R07. El fixture invalido es rechazado intencionalmente por el schema de configuracion y representa fallos bloqueantes de sandbox, confianza, autorizacion, auditoria y limites de recursos. Las pruebas del evaluador Native incluyen casos que pasan y bloqueantes; la politica Rego correspondiente debe producir la misma disposicion para la misma entrada normalizada.

## Limite de Evidencia

Este archivo documenta validacion reproducible de topologia. No es un registro de cierre GT ni reemplaza la evidencia canonica de gobernanza requerida antes de marcar un gap como terminado.

---
[Volver al Perfil de IA Agentica](./README.es.md)
