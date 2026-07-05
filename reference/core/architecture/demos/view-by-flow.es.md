# Vista de Arquitectura: Flujos y Gobernanza

> **Navegación Bilingüe:** [Ver Versión en Inglés](./view-by-flow.md)

**Estado:** Aprobado  
**Padre:** [C4 Master Architecture](../C4-MASTER-ARCHITECTURE.es.md)

## 1. Visión General de Flujos

Esta vista detalla el flujo sistémico paso a paso de cómo Evolith hace cumplir sus reglas de gobernanza. Demuestra la trazabilidad desde el SaaS Tracker (donde se solicita el proceso) a través del Core Engine (donde se evalúa) hasta el resultado final.

## 2. Flujo Estándar de Evaluación de Gate

Esta secuencia muestra cómo ocurre una evaluación de un "Gate" (puerta de fase) activada por un humano o de forma automatizada.

```mermaid
sequenceDiagram
    autonumber
    actor User as Ingeniero (vía Tracker/CLI)
    participant Tracker as Evolith Tracker BFF
    participant CoreAPI as Core API
    participant Resolver as Workspace Resolver
    participant OPA as Evaluador OPA
    participant Redis as Caché

    User->>Tracker: Solicita Evaluación de Gate (ej. "RC Stamped")
    Tracker->>CoreAPI: POST /api/v1/evaluate { workspaceRef, kinds, evidence, phaseId, gateId }
    
    CoreAPI->>Resolver: Resuelve workspaceRef
    Resolver-->>CoreAPI: Ruta Absoluta al Corpus
    
    CoreAPI->>Redis: Obtiene ruleset para la Fase/Gate
    alt Cache Miss
        CoreAPI->>Disk: Lee rulesets/phase-gates/phase-gates.rules.json
        CoreAPI->>Redis: Guarda ruleset en caché
    end
    
    CoreAPI->>OPA: Ejecuta evaluadores native/OPA (input = EvaluationContext + rulesets)
    OPA-->>CoreAPI: EvaluationResult (overallVerdict + recomendación no vinculante)
    
    CoreAPI-->>Tracker: Resultado de Evaluación Técnica
    Tracker->>Tracker: Actualiza Estado Canónico (Gate Decision)
    Tracker-->>User: Presenta Veredicto Final
```

## 3. Flujo de Trabajo Agéntico (Comando/Evento)

Esta secuencia muestra cómo se gobierna a un Agente IA en tiempo real al realizar tareas de múltiples pasos. El cliente envía comandos explícitos; SSE es solo un transporte posible para eventos servidor-a-cliente después de aceptar el comando.

```mermaid
sequenceDiagram
    autonumber
    actor Tracker as Tracker SaaS
    participant RuntimeAPI as Agent Runtime Command/Event API
    participant Orch as AgentOrchestrator
    participant Boundary as "Enforcer de Límites (OPA)"
    participant LLM as LLM Externo
    participant Exec as .harness Exec Port

    Tracker->>RuntimeAPI: Envía comando (POST /v1/agent/handle o /v1/agent/stream)
    RuntimeAPI-->>Tracker: Retorna envelope de resultado o acepta comando y abre stream de eventos
    
    Orch->>LLM: Envía Contexto y Herramientas Permitidas
    loop Hasta que la Tarea se Complete
        LLM-->>Orch: Llama a Herramienta (ej. validate_code)
        
        Orch->>Boundary: ¿Puede el LLM ejecutar esta herramienta en estos archivos?
        Boundary-->>Orch: Permitido (o Denegado)
        
        alt Permitido
            Orch->>Exec: Ejecuta script de herramienta
            Exec-->>Orch: Salida del Script
            Orch-->>RuntimeAPI: Emite evento de resultado de tool
            Orch->>LLM: Retorna Salida
        else Denegado
            Orch-->>RuntimeAPI: Emite evento de violación
            Orch->>LLM: Error - Acción no permitida
        end
    end
    
    Orch-->>RuntimeAPI: Emite evento de salida final
    RuntimeAPI-->>Tracker: Entrega eventos por SSE o stream equivalente
```

---
[Volver a la Arquitectura Maestra](../C4-MASTER-ARCHITECTURE.es.md)
