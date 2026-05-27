# V-05 — Mapa del Viaje de Onboarding por Rol

> **Audiencia:** RRHH, Tech Leads, Engineering Managers  
> **Propósito:** Ruta de incorporación estructurada — qué lee cada rol, cuándo y por qué  
> **Bilingüe:** [English](./v05-onboarding-journey-map.md)

---

## Visual 5-A — Flujo Universal de Onboarding (Todos los Roles)

```mermaid
flowchart LR
    classDef day fill:#0f172a,stroke:#334155,color:#fff,font-weight:bold
    classDef action fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef outcome fill:#14532d,stroke:#22c55e,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold

    D1["DÍA 1\nOrientación"]:::day --> A1["Leer: Resumen Ejecutivo\nVisual V-01\n30 min"]:::action
    A1 --> A2["Leer: Viaje Arquitectónico\nVisual V-02\n20 min"]:::action
    A2 --> G1{"¿Puedes explicar\nlas 4 etapas y\npor qué el default\nes Monolito Modular?"}:::gate
    G1 -->|SÍ| O1["✅ Fundación aprobada"]:::outcome
    G1 -->|NO| A1

    O1 --> D2["DÍAS 2-3\nRuta por Rol"]:::day
    D2 --> FORK{"¿Tu rol?"}

    FORK -->|Arquitecto/TL| PATH_ARCH["→ V-05-B\nRuta Arquitecto"]
    FORK -->|Backend Dev| PATH_DEV["→ V-05-C\nRuta Desarrollador"]
    FORK -->|QA/SDET| PATH_QA["→ V-05-D\nRuta QA"]
    FORK -->|DevOps/SRE| PATH_OPS["→ V-05-E\nRuta DevOps"]
    FORK -->|PM/PO| PATH_PM["→ V-05-F\nRuta PM"]
    FORK -->|Ejecutivo| PATH_EXEC["→ Solo V-01\nBriefing ejecutivo"]

    PATH_ARCH & PATH_DEV & PATH_QA & PATH_OPS & PATH_PM --> D3["SEMANA 2\nPrimera Contribución"]:::day
    D3 --> G2{"¿Puedes escribir\no revisar un ADR?"}:::gate
    G2 -->|SÍ| DONE["✅ Onboarding completado"]:::outcome
```

---

## Visual 5-B — Viaje Arquitecto / Tech Lead

```mermaid
journey
    title Arquitecto / Tech Lead — Primeras 2 Semanas
    section Día 1: Fundación
      Leer Resumen Ejecutivo (V-01): 5: Arquitecto
      Leer Viaje Arquitectónico (V-02): 5: Arquitecto
      Entender Relación del Ecosistema: 4: Arquitecto
    section Días 2-3: Estándares
      Estudiar Directivas Arquitectónicas: 5: Arquitecto
      Leer Roadmap Evolutivo: 5: Arquitecto
      Revisar Manifiesto de Ingeniería: 4: Arquitecto
    section Días 4-5: Decisiones
      Navegar Registro ADR (V-04): 5: Arquitecto
      Estudiar Matriz de Decisión ADR: 4: Arquitecto
      Leer Blueprint de Referencia (arc42/C4): 4: Arquitecto
    section Semana 2: Referencia Aplicada
      Explorar Portal de Arquitectura UMS: 5: Arquitecto
      Revisar Matriz de Trazabilidad UMS: 4: Arquitecto
      Leer Guía de Herencia de Repo Hijo: 5: Arquitecto
    section Fin Semana 2: Primer ADR
      Escribir primer borrador de ADR: 4: Arquitecto
      Enviar al Architecture Board: 3: Arquitecto
```

---

## Visual 5-C — Viaje Desarrollador Backend / Frontend

```mermaid
journey
    title Desarrollador Backend / Frontend — Primeras 2 Semanas
    section Día 1: Reglas
      Leer Manifiesto de Ingeniería: 5: Desarrollador
      Aprender lista negra de anti-patrones: 5: Desarrollador
      Entender SOLID + Hexagonal: 4: Desarrollador
    section Día 2: Tu Runtime
      Seleccionar perfil Node.js o .NET: 5: Desarrollador
      Leer ADRs específicos de runtime (V-04-C o V-04-D): 4: Desarrollador
      Estudiar Patrones Canónicos CP-01..04: 5: Desarrollador
    section Días 3-5: Código de Referencia
      Explorar código fuente UMS: 5: Desarrollador
      Trazar FS a ADR a TE en la matriz: 4: Desarrollador
      Correr UMS localmente y observar: 4: Desarrollador
    section Semana 2: Primera Entrega
      Escribir primer caso de uso con Hexagonal: 4: Desarrollador
      Agregar unit tests hasta 70% de cobertura: 4: Desarrollador
      Enviar PR con checklist de PR: 3: Desarrollador
```

---

## Visual 5-D — Viaje QA / SDET

```mermaid
journey
    title QA / SDET — Primeras 2 Semanas
    section Día 1: Modelo de Calidad
      Leer Pirámide de Testing ADR-0018: 5: QA
      Entender distribución 70/20/10: 5: QA
      Leer Guía de Contract Testing: 4: QA
    section Días 2-3: Estándares de Testing
      Estudiar ADR-0052 Aislamiento Unit: 4: QA
      Estudiar ADR-0053 Integración + E2E: 5: QA
      Revisar configuración del gate de calidad CI: 4: QA
    section Días 4-5: Evidencia Aplicada
      Revisar implementación de tests UMS: 5: QA
      Ejecutar suite de tests UMS localmente: 4: QA
      Trazar FS a criterios de aceptación: 4: QA
    section Semana 2: Primeros Tests
      Escribir contract test para un FS: 4: QA
      Escribir test de integración con Testcontainers: 3: QA
      Verificar que el gate CI pase: 5: QA
```

---

## Visual 5-E — Viaje DevOps / SRE

```mermaid
journey
    title DevOps / SRE — Primeras 2 Semanas
    section Día 1: Modelo de Infraestructura
      Leer ADR-0028 OSS Self-Hosted: 5: DevOps
      Entender principio OSS-first: 5: DevOps
      Leer Gitflow ADR-0050: 4: DevOps
    section Días 2-3: Stack de Observabilidad
      Estudiar OTel + Loki + Tempo (ADR-0007): 5: DevOps
      Revisar configuración de dashboards Grafana: 4: DevOps
      Explorar Hub de Infraestructura: 4: DevOps
    section Días 4-5: Operaciones
      Leer los 4 Runbooks (RB-01..04): 5: DevOps
      Revisar gates de calidad CI/CD (ADR-0005): 4: DevOps
      Estudiar Escenarios Multi-Cloud: 3: DevOps
    section Semana 2: Primera Contribución
      Configurar OTel localmente para producto: 4: DevOps
      Validar pipeline CI contra ADR-0005: 4: DevOps
      Contribuir o revisar un Runbook: 3: DevOps
```

---

## Visual 5-F — Viaje Product Manager / PO

```mermaid
journey
    title Product Manager / PO — Primera Semana
    section Día 1: Visión
      Leer Resumen Ejecutivo: 5: PM
      Entender frontera Evolith vs UMS: 5: PM
      Leer fases del Roadmap Evolutivo: 4: PM
    section Día 2: Límites de Alcance
      Leer Modelo de Referencia UMS: 5: PM
      Entender frontera Demo vs Referencia: 4: PM
      Revisar Índice de Documentación UMS: 4: PM
    section Días 3-5: Modelo de Entrega
      Leer Estándar de Escritura de Historias Funcionales: 5: PM
      Entender Definition of Done: 4: PM
      Revisar etapas del Framework SDLC: 3: PM
```

---

## Visual 5-G — Viaje Proveedor / Vendor Externo

```mermaid
flowchart TD
    classDef step fill:#1e3a5f,stroke:#3b82f6,color:#fff
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-weight:bold
    classDef doc fill:#14532d,stroke:#22c55e,color:#fff
    classDef stop fill:#7f1d1d,stroke:#ef4444,color:#fff

    START(["🤝 Vendor Externo\nSe Une al Ecosistema"])

    START --> S1["PASO 1 — Entender Contratos (Día 1)\nLeer: Baseline Agnóstico\nLeer: ADR-0040 Contratos Multi-Runtime"]:::step
    S1 --> S2["PASO 2 — Evaluación de Riesgo (Día 2)\nCompletar: checklist Vendor Risk Assessment\nConfirmar: frontera Adaptador respetada"]:::step
    S2 --> G1{"¿Evaluación\naprobada?"}:::gate
    G1 -->|NO — problemas encontrados| STOP["⛔ Integración no aprobada\nhasta que se resuelvan los problemas"]:::stop
    G1 -->|SÍ| S3["PASO 3 — Implementación del Contrato (Semana 1)\nImplementar contra spec OpenAPI\nEjecutar contract tests (Pact/schema)\nVerificar sin acoplamiento de dominio"]:::step
    S3 --> S4["PASO 4 — Validación (Semana 2)\nRevisión del Architecture Board\nSuite de tests de integración pasa\nAdaptador documentado en ADR del producto"]:::step
    S4 --> DONE["✅ Integración Aprobada\nMonitoreada via Registro de Riesgo de Vendor"]:::doc
```

---

*Parte de la [Estrategia de Comunicación Arquitectónica](../architecture-communication-strategy.es.md)*
