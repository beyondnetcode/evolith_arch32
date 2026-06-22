# Protocolo de Handoff SDLC de Evolith

## Descripción General

El Protocolo de Handoff define cómo se transfieren el conocimiento, contexto y artefactos entre fases del SDLC y entre agentes de IA que operan en diferentes fases.

## Flujo de Transición de Fases

```
Fase 0          Fase 1          Fase 2          Fase 3          Fase 4
(Descubrimiento) --> (Análisis) --> (Diseño) --> (Construcción) --> (Despliegue)
      |               |               |               |               |
      v               v               v               v               v
  Generar          Generar          Generar          Generar          Generar
  Manifiesto       Manifiesto       Manifiesto       Manifiesto       Manifiesto
  Handoff          Handoff          Handoff          Handoff          Handoff
```

## Estructura del Manifiesto de Handoff

Cada fase produce un `handoff-manifest.json` que captura:

```json
{
  "version": "1.0",
  "metadata": {
    "repository": "my-satellite",
    "fromPhase": "phase-1",
    "toPhase": "phase-2",
    "createdAt": "2024-01-15T10:00:00Z",
    "duration": "3d 4h 12m"
  },
  "artifacts": {
    "produced": [
      { "name": "requirements.md", "type": "document", "size": 15420 },
      { "name": "architecture-draft.md", "type": "document", "size": 8320 },
      { "name": "sdlc-manifest.json", "type": "json", "size": 2100 }
    ],
    "validated": [
      { "name": "adr-0002.md", "status": "accepted" },
      { "name": "adr-0018.md", "status": "accepted" }
    ]
  },
  "context": {
    "decisions": [
      {
        "adrId": "ADR-0002",
        "decision": "Usar Arquitectura Hexagonal",
        "rationale": "Separación de preocupaciones para mantenibilidad a largo plazo"
      }
    ],
    "constraints": [
      "Debe soportar runtime Node.js 20+",
      "PostgreSQL requerido para persistencia",
      "API REST para comunicación externa"
    ],
    "risks": [
      { "id": "R-001", "description": "Complejidad de migración", "mitigation": "Enfoque por fases" }
    ]
  },
  "agents": {
    "handoffFrom": {
      "name": "evolith-analysis-agent",
      "version": "1.0.0",
      "sessionId": "sess-abc123"
    },
    "handoffTo": {
      "name": "evolith-design-agent",
      "version": "1.0.0"
    }
  },
  "quality": {
    "gateStatus": "passed",
    "checksPerformed": ["architecture-review", "adr-compliance", "constraint-validation"],
    "metrics": {
      "coverage": "85%",
      "techDebtIndex": "2.3"
    }
  },
  "recommendations": [
    "Priorizar implementación de ADR-0002 en Fase 2",
    "Considerar pooling de conexiones PostgreSQL para escalabilidad"
  ]
}
```

## Handoff de Herramientas

Cuando un agente de IA completa su trabajo y otro comienza, las siguientes herramientas facilitan la transferencia:

### evolith-sdlc-handoff

Generar un manifiesto de handoff para una transición de fase:

```javascript
await mcp.callTool('evolith-sdlc-handoff', {
  path: '/repo',
  fromPhase: 'phase-1',
  toPhase: 'phase-2'
});
```

### evolith-sdlc-status

Verificar la fase actual y handoffs pendientes:

```javascript
await mcp.callTool('evolith-sdlc-status', {
  path: '/repo'
});
```

## Protocolo Agente-a-Agente

Cuando dos agentes de IA necesitan compartir contexto:

1. **Agente origen** genera el manifiesto antes de completar
2. **Agente destino** lee el manifiesto al inicio de la sesión
3. **Validación** asegura que todos los artefactos requeridos existen
4. **Checkpoint** registra el handoff exitoso en evolith.yaml

### Ejemplo: Handoff de Cursor AI a Claude AI

**Cursor AI (completando Fase 1):**
```
> smart-cli sdlc handoff --from phase-1 --to phase-2
✓ Manifiesto handoff creado: .evolith/phase-1/handoff.json
✓ Artefactos de contexto: 3 archivos
✓ ADRs validados: 2
✓ Listo para Fase 2
```

**Claude Desktop (iniciando Fase 2):**
```
> smart-cli sdlc receive --from phase-1
✓ Contexto recibido de phase-1
✓ Cargados 3 artefactos
✓ 2 ADRs aplicados a decisiones de diseño
✓ Listo para proceder con diseño de arquitectura
```

## Categorías de Artefactos

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| `requirements` | Necesidades y restricciones del usuario | `user-stories.md`, `constraints.json` |
| `architecture` | Decisiones de diseño y estructura | `adr-*.md`, `architecture.md` |
| `technical` | Especificaciones de implementación | `api-spec.yaml`, `schema.sql` |
| `quality` | Resultados de pruebas y validación | `test-plan.md`, `coverage-report.json` |
| `deployment` | Configuraciones de release y despliegue | `docker-compose.yml`, `deploy-checklist.md` |

## Quality Gates

Cada transición de fase requiere:

1. **Artefactos Completos** - Todos los artefactos requeridos producidos
2. **Cumplimiento ADR** - Todos los ADRs relevantes aceptados
3. **Validación de Restricciones** - Sin restricciones incumplidas
4. **Firma de Agente** - Agentes de handoff-from y handoff-to registrados

## Integración con MCP

Los agentes de IA que usan el servidor MCP de Evolith obtienen automáticamente:

- Acceso a manifiestos handoff vía `resources/list`
- Generación de handoff vía `evolith-sdlc-handoff`
- Estado de fase vía `evolith-sdlc-status`
- Inyección de contexto vía `prompts/get` (plantilla handoff)

## Ejemplo: Transición de Fase Completa

```javascript
// En su agente de IA (ej., Claude Desktop con Evolith MCP)

const manifest = await callTool('evolith-sdlc-handoff', {
  path: '/my-project',
  fromPhase: 'phase-1',
  toPhase: 'phase-2'
});

// Revisar el manifiesto
console.log('Handoff incluye:', manifest.artifacts.produced.length, 'artefactos');
console.log('Decisiones tomadas:', manifest.context.decisions.length);

// Proceder con trabajo de Fase 2
await callTool('evolith-architecture-validate', {
  path: '/my-project',
  level: 'F2'
});
```
