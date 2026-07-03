# Bucle de Mejora Continua

> **Navegación Bilingüe:** [English Version](./self-improving-loop.md)

## Propósito

Operar el bucle de retroalimentación del harness Evolith: detectar drift, cargar contexto mínimo, ejecutar el rol asignado, validar evidencia, registrar gaps o cierres y promover lecciones repetidas a reglas, skills, playbooks, schemas o checks CI durables.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `self-improving-loop` |
| Propietario | `@winston` |
| Versión | `1.0.0` |
| Entradas | `AGENTS.md`, `.harness/rules/global-rules.md`, `.harness/playbooks/self-improving-loop.md`, tablero de gaps, registro de cierres, salidas de validación |
| Salidas | Registro JSON de progress audit, próximos pasos priorizados, recomendación de actualización de gap/cierre |

## Algoritmo

1. Leer las reglas globales, el rol de agente asignado, la solicitud de tarea y el tablero canónico de gaps.
2. Construir un paquete de contexto mínimo que cite toda fuente cargada durante la ejecución.
3. Ejecutar o delegar la tarea mediante el rol BMAD apropiado.
4. Ejecutar los gates de validación mínimos relevantes y registrar evidencia de pass/fail/bloqueo.
5. Convertir hallazgos abiertos en entradas `GT-*` o actualizar evidencia de cierre cuando se cumplan los criterios.
6. Promover hallazgos repetidos a una regla, skill, playbook, schema o validador CI.
7. Emitir un registro de progress-audit usando `.harness/schemas/progress-audit.schema.json`.

## Uso

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --dry-run
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --append .harness/reports/progress-audit.jsonl
```

## Formato de Salida

El script imprime un objeto JSON compatible con `.harness/schemas/progress-audit.schema.json`. Cuando se usa `--append` sin `--dry-run`, anexa el objeto JSON compacto como una línea JSONL al archivo de auditoría seleccionado.
