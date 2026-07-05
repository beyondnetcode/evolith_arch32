# Mapper de Trazabilidad de Requisitos

## Propósito

Mapea épicos, historias y requisitos a ADRs, reglas de gobernanza y artefactos de prueba. Detecta requisitos huérfanos — elementos sin ADR vinculado, sin regla de gobernanza o sin cobertura de pruebas.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `requirements-traceability-mapper` |
| Propietario | `@analyst` |
| Versión | `1.0.0` |
| Entradas | Archivos de épicos/historias, índice de ADRs (`reference/core/architecture/adrs/`), reglas de gobernanza (`reference/core/sdlc/standards/`) |
| Salidas | Matriz de trazabilidad (JSON) |

## Algoritmo

1. **Escanear épicos/historias** — Parsear archivos markdown en `docs/planning-artifacts/` para IDs de historias, criterios de aceptación y referencias vinculadas.
2. **Escanear ADRs** — Parsear `reference/core/architecture/adrs/core/` para números de ADR, títulos y estado.
3. **Escanear reglas** — Parsear estándares de gobernanza para IDs de reglas y su alcance.
4. **Construir mapeos** — Para cada historia, detectar enlaces explícitos a ADRs (`ADR-NNNN`) y reglas (`R-NN`).
5. **Detectar huérfanos** — Marcar historias sin enlace ADR, sin enlace de regla o sin referencia de prueba.
6. **Salir matriz** — Producir JSON con estado de enlace por historia y lista de huérfanos.

## Uso

```bash
node .harness/scripts/skills/requirements-traceability-mapper.mjs
```

### Flags

| Flag | Descripción |
|------|-------------|
| `--help`, `-h` | Mostrar mensaje de ayuda |
| `--format json\|md` | Formato de salida (predeterminado: `json`) |
| `--story-dir <path>` | Sobrescribir directorio de historias (predeterminado: `docs/planning-artifacts/`) |

## Formato de Salida

```json
{
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "totalStories": 12,
  "linked": 9,
  "orphans": 3,
  "matrix": [
    {
      "storyId": "STORY-001",
      "title": "Implementar flujo de auth",
      "linkedAdrs": ["ADR-0012"],
      "linkedRules": ["R-25"],
      "hasTestRef": true,
      "status": "complete"
    }
  ],
  "orphanReport": [
    {
      "storyId": "STORY-005",
      "title": "Agregar logging",
      "missingLinks": ["adr", "rule"],
      "severity": "warning"
    }
  ]
}
```
