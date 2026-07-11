# C4 Nivel 3: Componentes del Core API

> **Navegación Bilingüe:** [Ver Versión en Inglés](./core-api-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Core API** es la superficie de evaluación stateless de Evolith. Recibe peticiones HTTP REST, resuelve referencias de workspace hacia una ubicación segura del filesystem, evalúa payloads canónicos `EvaluationContext` mediante `@beyondnet/evolith-core-domain`, sirve lecturas de referencia/rulesets y retorna resultados técnicos de evaluación.

Se adhiere a **Clean Architecture** para los flujos de evaluación y validación. La implementación actual también expone un registro in-memory transitorio de satélites para flujos de compatibilidad y referencia; ese registro no es la fuente de verdad tenant/product de largo plazo.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes para Core API

    Container_Boundary(api, "Contenedor Core API") {
        
        Component(controllers, "Controladores REST", "NestJS @Controller", "Maneja endpoints /api/v1/evaluate, gates, phases, architecture, reference, metrics, health y satellites.")
        
        Component(orchestrator, "EvaluationOrchestrator", "@beyondnet/evolith-core-domain/evaluation", "Entrada canónica stateless para EvaluationContext y EvaluationResult.")
        Component(usecases, "Casos de Uso", "@beyondnet/evolith-core-domain/application", "Orquesta validación, evaluación de gates, propuestas de transición de fase, validación de satélites y chequeos de arquitectura.")
        
        Component(domain, "Entidades de Dominio y Reglas", "@beyondnet/evolith-core-domain", "Reglas puras de negocio. Modelos stateless de gates, reglas de validación de evidencia.")
        
        Component(workspace, "Workspace Resolver", "Adaptador de Infraestructura", "Resuelve de forma segura el token opaco 'workspaceRef' a rutas físicas. Previene path traversal.")
        
        Component(evaluators, "Evaluadores Native / OPA", "Capa de Evaluación", "Ejecuta handlers nativos de reglas y evaluadores OPA/Rego donde estén configurados.")
        
        Component(redis, "Adaptador de Caché", "Adaptador de Infraestructura", "Interfaz con Redis/cache-manager para cachear topologías y lecturas de referencia.")
        Component(satellites, "Registro de Satélites", "Servicio de Aplicación Transitorio", "Superficie in-memory CRUD/linking para flujos de referencia de satélites; no es estado canónico de Tracker.")

        Rel(controllers, orchestrator, "Invoca evaluación canónica")
        Rel(controllers, usecases, "Invoca casos de uso")
        Rel(controllers, satellites, "Usa para endpoints de satélites")
        Rel(orchestrator, usecases, "Compone pipeline existente")
        Rel(usecases, domain, "Usa")
        Rel(usecases, workspace, "Solicita rutas a")
        Rel(usecases, evaluators, "Delega evaluación de reglas a")
        Rel(usecases, redis, "Verifica/Escribe caché vía")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Controladores REST** | Exponen rutas reales como `POST /api/v1/evaluate`, `POST /api/v1/gates/:gateId/evaluate`, `POST /api/v1/phases/transition`, `GET /api/v1/rulesets`, `/metrics` y `/health`. |
| **EvaluationOrchestrator** | Entrada canónica de evaluación stateless. Resuelve `workspaceRef`, mapea el pipeline existente a `EvaluationResult` y despacha evaluadores de architecture/checkpoint/topology/blueprint/deployment. |
| **Casos de Uso** | Coordinan validación, chequeos de gate, propuestas de transición de fase, validación de satélites y chequeos de drift arquitectónico. |
| **@beyondnet/evolith-core-domain** | Lógica central de negocio y contratos, desacoplada de NestJS. Define contextos/resultados de evaluación, gates, evidencia, transiciones de fase, eventos, providers y validators. |
| **Workspace Resolver** | Límite de seguridad. Traduce un `workspaceRef` opaco en una ruta absoluta segura bajo `WORKSPACE_ROOT`. |
| **Evaluadores Native / OPA** | Ejecutan handlers TypeScript de reglas y evaluadores OPA/Rego según el engine y ruleset seleccionados. |
| **Registro de Satélites** | Superficie actual de compatibilidad in-memory bajo `/api/v1/satellites`. No debe tratarse como store canónico de estado Tracker. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
