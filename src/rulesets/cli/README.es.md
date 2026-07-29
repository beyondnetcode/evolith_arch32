# Rulesets del CLI

> **Navegación bilingüe:** [English version](./README.md)

Reglas legibles por máquina para preparación de release del Evolith Evolith CLI y paridad con Evolith Core.

## Rulesets

| Ruleset | Propósito |
|---|---|
| [Preparación de Release del CLI](./release-readiness.rules.json) | Define evidencia mínima de build, pruebas, paquete y smoke MCP antes de liberar el CLI. |
| [Paridad CLI/Core](./core-parity.rules.json) | Exige que cada capacidad de regla Core sea trazable a CLI, MCP, pruebas y estado de evidencia. |
| [Taxonomía de Exit Codes del CLI](./exit-code-taxonomy.rules.json) | Exige que todo comando del CLI salga con un código de la taxonomía publicada (`0` pass, `1` fallo de herramienta, `2` bloqueado, `3` entrada inválida), sobre un escaneo no vacío y sin ensanchar la taxonomía para absorber al infractor. Paridad Rego en [`opa/cli-exit-code-taxonomy.rego`](../opa/cli-exit-code-taxonomy.rego). |

## Intención de Validación

Estos rulesets son autoritativos para revisiones de release y deben conectarse a la validación del CLI como checks ejecutables antes de promover una versión del CLI de beta a stable.

