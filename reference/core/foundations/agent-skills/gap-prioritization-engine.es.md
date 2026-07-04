# Motor de Priorización de Gaps

## Propósito

Lee `gap-tracking.md`, calcula puntuación de prioridad multiplicando impacto × urgencia, detecta gaps estancados (>30 días sin cambio de estado) y produce un reporte de gaps priorizados.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `gap-prioritization-engine` |
| Propietario | `@po` |
| Versión | `1.0.0` |
| Entradas | `reference/core/control-center/gaps/gap-tracking.md`, `gap-closure-evidence.json` |
| Salidas | Reporte de gaps priorizados (JSON) |

## Algoritmo

1. **Parsear gap-tracking.md** — Extraer todas las entradas `GT-*` con estado, criticidad, complejidad y fecha de última modificación.
2. **Parsear evidencia de cierre** — Leer `gap-closure-evidence.json` para gaps DONE y excluir de la lista activa.
3. **Calcular prioridad** — Para cada gap activo: `prioridad = impacto × urgencia` donde:
   - Impacto: P0=4, P1=3, P2=2, P3=1
   - Urgencia: basada en días desde creación (más nuevos = mayor)
4. **Detectar estancamiento** — Marcar gaps sin cambio de estado en >30 días como `stagnant`.
5. **Clasificar y salir** — Ordenar por prioridad descendente, producir reporte JSON con puntuación por gap.

## Uso

```bash
node .harness/scripts/skills/gap-prioritization-engine.mjs
```

### Flags

| Flag | Descripción |
|------|-------------|
| `--help`, `-h` | Mostrar mensaje de ayuda |
| `--stagnant-threshold <days>` | Sobrescribir umbral de detección de estancamiento (predeterminado: 30) |
| `--include-done` | Incluir gaps DONE en la salida |

## Formato de Salida

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalActive": 8,
  "stagnantCount": 2,
  "gaps": [
    {
      "id": "GT-100",
      "title": "Implementar rate limiting",
      "status": "evaluated",
      "criticality": "P0",
      "complexity": "M",
      "impact": 4,
      "urgency": 3.5,
      "priority": 14.0,
      "daysSinceCreation": 45,
      "stagnant": false
    }
  ],
  "stagnantGaps": [
    {
      "id": "GT-095",
      "title": "Gap antiguo",
      "daysSinceStatusChange": 62,
      "currentStatus": "candidate"
    }
  ]
}
```
