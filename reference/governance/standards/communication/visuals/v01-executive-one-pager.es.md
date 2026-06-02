# V-01 — Resumen Ejecutivo: Visión General del Ecosistema Evolith

> **Audiencia:** Ejecutivo / Sponsor  
> **Propósito:** Punto de entrada de una sola página — sin jerga, solo valor  
> **Bilingüe:** [English](./v01-executive-one-pager.md)  
> **Regla de vigencia:** Este visual debe revisarse cada vez que Evolith introduzca una evolución fuerte en SDLC, ADRs, runtimes, gobernanza o producto de referencia.

---

## La Pregunta que Este Visual Responde

> "¿Qué es Evolith, qué es UMS y por qué necesitamos ambos?"

---

## Visual 1-A — El Ecosistema de Dos Capas

```mermaid
flowchart TB
    classDef framework fill:#1e3a5f,stroke:#4a90d9,color:#ffffff,font-weight:bold
    classDef product fill:#1a5c38,stroke:#4caf50,color:#ffffff,font-weight:bold
    classDef board fill:#4a1a6b,stroke:#9c27b0,color:#ffffff,font-weight:bold
    classDef label fill:#f5f5f5,stroke:#ccc,color:#333,font-style:italic

    BOARD["🏛️ Architecture Board\nGobierna la baseline arquitectónica corporativa"]:::board

    subgraph EVOLITH["EVOLITH ARCH32 — Referencia Corporativa de Arquitectura"]
        E1["📐 Registro ADR\nDecisiones con contexto, justificación y trade-offs"]:::framework
        E2["🗺️ Blueprints y Patrones\nModelos de referencia, patrones canónicos y guías de topología"]:::framework
        E3["📜 SDLC y Estándares de Ingeniería\nDefinition of Done, quality gates y plantillas de artefactos"]:::framework
        E4["🔒 Gobernanza\nPropiedad del Board, taxonomía de repositorios y reglas de evolución"]:::framework
    end

    subgraph UMS["UMS — Producto Empresarial de Referencia"]
        U1["⚙️ Producto .NET 10 en ejecución\nImplementación de referencia de identidad y autorización"]:::product
        U2["🧩 Bounded Contexts DDD\nIdentity, Authorization, Configuration, Approvals, Compliance, IGA, Audit, Cache, Console"]:::product
        U3["📊 Observabilidad y Operaciones\nOpenTelemetry, logs, trazas, dashboards y runbooks"]:::product
        U4["🏗️ Evidencia Aplicada\nCódigo, pruebas, CI/CD, modelo de datos y documentación de trazabilidad"]:::product
    end

    BOARD --> EVOLITH
    EVOLITH -->|"define reglas reutilizables"| UMS
    UMS -.->|"promueve aprendizajes probados hacia arriba"| EVOLITH

    NOTE["💡 Evolith = Las Reglas   |   UMS = La Prueba"]:::label
    UMS --> NOTE
```

---

## Visual 1-B — Por Qué Necesitamos Ambos

```mermaid
flowchart LR
    classDef problem fill:#7f1d1d,stroke:#ef4444,color:#ffffff,font-weight:bold
    classDef solution fill:#14532d,stroke:#22c55e,color:#ffffff,font-weight:bold
    classDef outcome fill:#1e3a5f,stroke:#3b82f6,color:#ffffff,font-weight:bold

    P1["❌ Sin Evolith\nCada equipo reinventa arquitectura, estándares y reglas de delivery"]:::problem
    P2["❌ Sin UMS\nLas reglas arquitectónicas quedan teóricas y sin evidencia ejecutable"]:::problem

    S1["✅ Con Evolith\nUna baseline arquitectónica gobernada heredada por todos los productos"]:::solution
    S2["✅ Con UMS\nUn producto real valida la baseline con evidencia ejecutable"]:::solution

    O["🎯 RESULTADO\nDelivery predecible, menor riesgo arquitectónico y aprendizaje reutilizable entre equipos"]:::outcome

    P1 --> S1
    P2 --> S2
    S1 --> O
    S2 --> O
```

---

## Visual 1-C — Adopción Progresiva Sin Complejidad Big-Bang

```mermaid
timeline
    title Roadmap de Adopción Evolith — Adopta lo Necesario, Prueba Antes de Escalar
    section Essential
        Gobernar lo básico : PRD, Historia Funcional, Historia Técnica, Release Notes
                            : Ideal para MVPs y equipos pequeños
    section Governed
        Agregar controles de release : ADRs, Test Summary Report, Quality Gates
                                      : Ideal para releases productivos
    section Enterprise
        Escalar accountability : RACI, Scorecard Ejecutivo, Trazabilidad, Readiness Operativo
                               : Ideal para productos multi-equipo, regulados o críticos
```

---

## Visual 1-D — Valor por Stakeholder

```mermaid
mindmap
  root((Valor<br/>Evolith))
    Ejecutivo
      Inversión arquitectónica predecible
      Menor riesgo de delivery y producción
      Gobernanza sin burocracia innecesaria
      Evidencia clara para decidir
    Líderes de Tecnología
      Estándares reutilizables entre equipos
      Modelo de adopción progresiva
      Gates objetivos de calidad y release
      Mejor alineamiento entre estrategia y ejecución
    Equipos de Producto
      Flujo SDLC claro desde intención hasta release
      Artefactos calibrados por riesgo y madurez
      UMS como producto vivo de referencia
      Menos ambigüedad durante delivery
    Ingenieros
      Guía DDD y Clean Architecture
      Patrones canónicos y ADRs reutilizables
      Definition of Done claro
      Trazabilidad de requerimiento a implementación
    QA / DevOps
      Quality gates ligados a decisiones de release
      Readiness operativo antes de producción
      Expectativas de observabilidad y rollback
      Conversaciones go/no-go basadas en evidencia
```

---

## Mensaje Ejecutivo Final

> Evolith no es un repositorio de documentos. Es un modelo operativo de arquitectura gobernada.  
> UMS demuestra que el modelo puede implementarse en software real.

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md).*