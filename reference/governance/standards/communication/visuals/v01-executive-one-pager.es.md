# V-01 — Resumen Ejecutivo: Visión General del Ecosistema Evolith

> **Audiencia:** Ejecutivo / Sponsor  
> **Propósito:** Punto de entrada de una sola página — sin jerga, solo valor  
> **Bilingüe:** [English](./v01-executive-one-pager.md)

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
    classDef arrow fill:none,stroke:#888,color:#333
    classDef label fill:#f5f5f5,stroke:#ccc,color:#333,font-style:italic

    BOARD["🏛️ Architecture Board\nEstablece el estándar corporativo"]:::board

    subgraph EVOLITH["EVOLITH ARCH32 — Framework Corporativo de Arquitectura"]
        E1["📐 57 Decisiones Arquitectónicas\nADRs con contexto, justificación y trade-offs"]:::framework
        E2["🗺️ Blueprints y Patrones\nModelos de referencia, patrones canónicos"]:::framework
        E3["📜 Estándares de Ingeniería\nManifiesto, SDLC, Definition of Done"]:::framework
        E4["🔒 Gobernanza\nPropiedad del Board, revisión ADR, taxonomía"]:::framework
    end

    subgraph UMS["UMS — Implementación de Referencia Empresarial"]
        U1["⚙️ Producto .NET 8 en Ejecución\n8 bounded contexts, 16 historias funcionales"]:::product
        U2["🧪 89 Historias Técnicas\nTrazabilidad completa a cada ADR Evolith"]:::product
        U3["📊 Stack de Observabilidad\nOTel · Loki · Tempo · Grafana"]:::product
        U4["🏗️ 6 Habilitadores Técnicos\nOutbox · Sagas · CQRS · RLS · JWT · Graph"]:::product
    end

    BOARD --> EVOLITH
    EVOLITH -->|"hereda de\n(cada producto)"| UMS
    UMS -.->|"promueve descubrimientos\nhacia arriba"| EVOLITH

    NOTE["💡 Evolith = Las Reglas   |   UMS = La Prueba"]:::label
    UMS --> NOTE
```

---

## Visual 1-B — Por Qué Necesitamos Ambos

```mermaid
flowchart LR
    classDef problem fill:#7f1d1d,stroke:#ef4444,color:#white
    classDef solution fill:#14532d,stroke:#22c55e,color:#white
    classDef outcome fill:#1e3a5f,stroke:#3b82f6,color:#white

    P1["❌ Sin Evolith\nCada equipo reinventa\nla arquitectura desde cero"]:::problem
    P2["❌ Sin UMS\nLas reglas existen en papel\npero nadie sabe si funcionan"]:::problem

    S1["✅ Con Evolith\nUn conjunto curado de decisiones,\npatrones y estándares\nheredado por todos los productos"]:::solution
    S2["✅ Con UMS\nProducto empresarial real\nque prueba que cada regla funciona\nen producción"]:::solution

    O["🎯 RESULTADO\nArquitectura predecible\nen cada producto y\ncada equipo de la org"]:::outcome

    P1 -->|"resuelto por"| S1
    P2 -->|"resuelto por"| S2
    S1 --> O
    S2 --> O
```

---

## Visual 1-C — El Modelo de Protección de Inversión en 3 Fases

```mermaid
timeline
    title Roadmap de Evolución Evolith — La Inversión Crece, No se Reemplaza
    section Fase 1 · MVP
        Monolito Modular    : Tiempo de llegada al mercado rápido
                            : Fronteras de dominio limpias desde el día 1
                            : Deuda estructural cero heredada
    section Fase 2 · Escalar
        Extracción Selectiva : Extraer solo lo que las métricas demandan
                             : Dapr abstrae la complejidad del service mesh
                             : Observabilidad completa activada
    section Fase 3 · North Star
        Soberanía en la Nube : Cambiar cualquier vendor en menos de 24 horas
                             : Red zero-trust aplicada
                             : Compliance-as-Code en cada PR
```

---

## Visual 1-D — Valor por Stakeholder

```mermaid
mindmap
  root((Valor<br/>Evolith))
    Ejecutivo
      Costos de arquitectura predecibles
      Sin riesgo de vendor lock-in
      Modelo probado reduce fallos de entrega
      Gobernanza sin burocracia
    Equipos de Producto
      57 decisiones pre-validadas
      Sin reinventar la rueda
      Ruta de evolución clara
      UMS como referencia viva
    Ingenieros
      Patrones canónicos para copiar
      Lista negra de anti-patrones aplicada en CI
      Perfiles ADR por runtime
      Trazabilidad completa a requerimientos
    QA / DevOps
      Gate de cobertura 70% en CI
      4 runbooks operacionales
      Stack OTel + Loki + Grafana listo
      Gitflow + gates de calidad semánticos
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
