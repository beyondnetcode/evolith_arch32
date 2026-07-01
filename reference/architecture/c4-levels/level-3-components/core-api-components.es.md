# C4 Nivel 3: Componentes del Core API

> **Navegación Bilingüe:** [Ver Versión en Inglés](./core-api-components.md)

**Estado:** Aprobado  
**Nivel:** 3 - Componentes  
**Padre:** [C4 Nivel 3: Hub de Componentes](./README.es.md)

## 1. Contexto del Contenedor

El **Core API (BFF)** es el motor de evaluación stateless de Evolith. Recibe peticiones HTTP REST, resuelve referencias de workspaces para encontrar el corpus de referencia apropiado, evalúa gates usando OPA o un Motor Nativo, y retorna un resultado de evaluación técnica.

Se adhiere estrictamente a **Clean Architecture**.

## 2. Diagrama de Componentes

```mermaid
C4Component
    title Diagrama de Componentes para Core API (BFF)

    Container_Boundary(api, "Contenedor Core API") {
        
        Component(controllers, "Controladores REST", "NestJS @Controller", "Maneja peticiones HTTP, validación (DTOs) y serialización.")
        
        Component(usecases, "Casos de Uso (Servicios de Aplicación)", "Capa de Aplicación", "Orquesta la lógica de dominio. Ej. PhaseTransitionUseCase, GateEvaluationUseCase.")
        
        Component(domain, "Entidades de Dominio y Reglas", "@evolith/core-domain", "Reglas puras de negocio. Modelos stateless de gates, reglas de validación de evidencia.")
        
        Component(workspace, "Workspace Resolver", "Adaptador de Infraestructura", "Resuelve de forma segura el token opaco 'workspaceRef' a rutas físicas. Previene path traversal.")
        
        Component(opa, "Evaluador OPA", "Adaptador de Infraestructura", "Ejecuta rulesets de Open Policy Agent basados en WASM.")
        
        Component(redis, "Adaptador de Caché", "Adaptador de Infraestructura", "Interfaz con Redis para cachear rulesets (Cache-Manager).")

        Rel(controllers, usecases, "Invoca")
        Rel(usecases, domain, "Usa")
        Rel(usecases, workspace, "Solicita rutas a")
        Rel(usecases, opa, "Delega evaluación a")
        Rel(usecases, redis, "Verifica/Escribe caché vía")
    }
```

## 3. Desglose de Componentes Clave

| Componente | Responsabilidad |
|------------|-----------------|
| **Controladores REST** | Exponen endpoints como `POST /v1/gates/evaluate`. Aseguran que los payloads cumplan con los esquemas DTO. |
| **Casos de Uso** | Coordinan el flujo: recibir input -> resolver workspace -> obtener ruleset (caché o disco) -> evaluar vía OPA -> retornar resultado. |
| **@evolith/core-domain** | La lógica central de negocio, desacoplada de NestJS. Define qué es un `Gate` o qué es una `Evidence`. |
| **Workspace Resolver** | Límite de seguridad. Traduce un token opaco `workspaceRef` (provisto por Tracker) en una ruta absoluta y segura al corpus de referencia en disco. |
| **Evaluador OPA** | Carga políticas `.wasm` compiladas de Rego, inyecta los rulesets JSON y la evidencia de entrada, y retorna el resultado de evaluación. |

---
[Volver al Nivel 3: Hub de Componentes](./README.es.md)
