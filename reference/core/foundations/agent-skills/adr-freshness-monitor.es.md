# Monitor de Freshness de ADRs

## Propósito

Escanea todos los ADRs en `reference/core/architecture/adrs/` y reporta obsolescencia basada en la fecha de última modificación git. Marca ADRs con más de 180 días como `stale` y más de 365 días como `critical`.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `adr-freshness-monitor` |
| Propietario | `@architect` |
| Versión | `1.0.0` |
| Entradas | Directorio `reference/core/architecture/adrs/` |
| Salidas | Reporte de freshness (JSON) |

## Algoritmo

1. **Collectar archivos ADR** — Recorrer `reference/core/architecture/adrs/core/` recursivamente, recolectando archivos `NNNN-*.md` (excluyendo versiones ES, README y archivos matrix).
2. **Obtener fecha de última modificación** — Para cada ADR, ejecutar `git log -1 --format=%ad --date=iso` para obtener timestamp de última modificación.
3. **Clasificar estado** — Aplicar umbrales:
   - `>365 días` → `critical`
   - `>180 días` → `stale`
   - De lo contrario → `healthy`
4. **Agregar conteos** — Contar ADRs en cada categoría.
5. **Salir reporte** — Producir JSON con detalles por ADR y conteos resumidos.

## Uso

```bash
node .harness/scripts/skills/adr-freshness-monitor.mjs
```

### Flags

| Flag | Descripción |
|------|-------------|
| `--help`, `-h` | Mostrar mensaje de ayuda |
| `--stale-threshold <days>` | Sobrescribir umbral de stale (predeterminado: 180) |
| `--critical-threshold <days>` | Sobrescribir umbral de critical (predeterminado: 365) |

## Formato de Salida

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalAdrs": 68,
  "summary": {
    "total": 68,
    "staleCount": 12,
    "criticalCount": 3,
    "healthyCount": 53
  },
  "critical": [
    {
      "file": "reference/core/architecture/adrs/core/0010-legacy-auth.md",
      "lastModified": "2025-01-15T10:30:00.000Z",
      "daysSinceModification": 525,
      "status": "critical"
    }
  ],
  "stale": [],
  "healthy": []
}
```

## Integración

Esta habilidad envuelve el script existente `.harness/scripts/adr-freshness-monitor.mjs` y agrega la capa de contrato de habilidad. La implementación subyacente es compartida.
