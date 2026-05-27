# Evolith — Estrategia de Comunicación y Adopción Arquitectónica

> **Navegación bilingüe:** [English](./architecture-communication-strategy.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Aprobado  
> **Última revisión:** 2026-05-27

---

## Propósito de Este Documento

Este documento responde una pregunta: **¿cómo explicamos el estándar de arquitectura corporativa Evolith a todos los que necesitan usarlo — sin abrumarlos?**

Proporciona:
- Una narrativa ejecutiva de todo el ecosistema
- Una clasificación de qué es y hace cada repositorio
- Propuestas de modelos visuales para cada capa de audiencia
- Una estrategia de comunicación progresiva
- Un modelo de gobernanza y roadmap de adopción
- Rutas de onboarding específicas por rol

---

## 1. La Narrativa Ejecutiva en 30 Segundos

> **Evolith es el contrato arquitectónico corporativo.**
> Cada producto de software de la organización lo hereda, lo extiende y reporta hacia él.
> Evita reinventar la rueda — y evita que los equipos construyan en direcciones incompatibles.

> **UMS es la prueba de que funciona.**
> Es un producto empresarial real y en ejecución construido enteramente sobre el estándar Evolith.
> Muestra — no solo dice — cómo se comporta la arquitectura en producción.

Juntos forman un **ecosistema corporativo de dos capas:**

```
┌─────────────────────────────────────────────────────────────┐
│                    EVOLITH ARCH32                           │
│         Framework de Arquitectura Corporativa               │
│  "Las reglas, decisiones, patrones y roadmap evolutivo"    │
│                                                             │
│  ADRs · Blueprints · Estándares · SDLC · Gobernanza        │
└──────────────────────┬──────────────────────────────────────┘
                       │ hereda de / implementa
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        UMS                                  │
│          Implementación de Referencia Empresarial           │
│  "La demostración ejecutable de que las reglas funcionan"  │
│                                                             │
│  .NET 8 · SQL Server · EF Core · 8 Contextos Acotados      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa de Relación del Ecosistema

### 2.1 Qué ES y qué NO ES cada repositorio

| Dimensión | Evolith Arch32 | UMS |
|---|---|---|
| **Tipo** | Framework de arquitectura | Implementación de producto |
| **Contiene** | Decisiones, estándares, blueprints, ADRs, patrones | Código fuente, tests, CI/CD, docs de producto |
| **Propósito** | Definir CÓMO construir — reglas y filosofía | Mostrar CÓMO fue construido — evidencia y ejecución |
| **Audiencia** | Todos los equipos (estratégico) | Equipos de ingeniería (táctico) |
| **Ciclo de vida** | Lento — evoluciona con la industria y necesidades corporativas | Rápido — evoluciona con requerimientos del producto |
| **Herencia** | Upstream (padre) | Downstream (hijo/satélite) |
| **Política de divergencia** | No divergible — define la línea base | Puede divergir con ADR override documentado |
| **Código** | Ninguno (intencional) | Producto empresarial completo |

### 2.2 Matriz de Clasificación de Contenido

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  CLASIFICACIÓN DE CONTENIDO EVOLITH                      │
├─────────────────────────┬────────────────────────────────────────────────┤
│ CAPA                    │ CONTENIDO                                      │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Arquitectura            │ Directivas Arquitectónicas                     │
│ Estratégica             │ Roadmap de Estrategia Evolutiva                │
│                         │ Matriz de Madurez (TOGAF ACMM)                 │
│                         │ Análisis del Teorema CAP                       │
│                         │ Escenarios Multi-Cloud                         │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Fundación de Plataforma │ Blueprint de Referencia (arc42 / modelo C4)    │
│                         │ Línea Base Tecnológica Agnóstica               │
│                         │ Stack Tecnológico Autoritativo (perfiles)      │
│                         │ Checklist de Simplicidad Fase 01               │
│                         │ Especificación de Topología C4                 │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Decisiones              │ 57 ADRs: Core / Node.js / .NET / Android       │
│ Arquitectónicas         │ Matriz de Decisiones ADR                       │
│                         │ Criterios de Extracción a Microservicios       │
├─────────────────────────┼────────────────────────────────────────────────┤
│ DDD / Clean             │ Patrones de Diseño Táctico (ADR-0019)          │
│ Architecture Baseline   │ Librería de Primitivas DDD (ADR-0029)          │
│                         │ Patrones Canónicos (CP-01..08)                 │
│                         │ Patrón Hexagonal Port/Adapter                  │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Estándares de           │ Manifiesto de Ingeniería                       │
│ Ingeniería              │ Convenciones de Nomenclatura (ADR-0056)        │
│                         │ Reglas Clean Code & SOLID                      │
│                         │ Lista negra de anti-patrones                   │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Gobernanza              │ Propiedad del Architecture Board               │
│                         │ Proceso de revisión y aprobación de ADRs       │
│                         │ Glosario de términos                           │
│                         │ Taxonomía del Repositorio                      │
│                         │ Guía de Herencia para Repositorios Hijos       │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Framework de Entrega    │ Framework SDLC (3 etapas)                      │
│                         │ SDLC enfocado en Construcción                  │
│                         │ Definition of Done                             │
│                         │ Estándar de Escritura de Functional Stories    │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Observabilidad /        │ Stack OTel + Loki + Tempo                      │
│ Seguridad / DevOps      │ Dashboards Grafana                             │
│                         │ Estrategia de Ramas Gitflow (ADR-0050)         │
│                         │ Quality Gates CI/CD (ADR-0005)                 │
│                         │ Vendor Risk Assessment                         │
├─────────────────────────┼────────────────────────────────────────────────┤
│ Implementación de       │ Hub UMS (documentación de límite)              │
│ Referencia              │ Modelo de Referencia UMS                       │
│                         │ Límite Demo vs Referencia                      │
└─────────────────────────┴────────────────────────────────────────────────┘
```

---

## 3. Landscape Arquitectónico — Vista Completa del Ecosistema

```
╔═══════════════════════════════════════════════════════════════════════╗
║           ECOSISTEMA DE ARQUITECTURA CORPORATIVA EVOLITH             ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ CAPA DE VISIÓN                                     [BOARD]      │ ║
║  │  "Por qué construimos como construimos"                         │ ║
║  │  Directivas Arquitectónicas · Roadmap Evolutivo · Madurez      │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ CAPA DE ESTÁNDARES                              [ARQUITECTOS]   │ ║
║  │  "Cuáles son las reglas"                                        │ ║
║  │  ADRs · Blueprints · Manifiesto de Ingeniería · Glosario       │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ CAPA DE ENTREGA                                  [INGENIEROS]   │ ║
║  │  "Cómo entregamos"                                              │ ║
║  │  SDLC · DoD · Estándares de Stories · Gitflow · CI/CD Gates    │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ CAPA DE PATRONES                           [TODOS LOS DEVS]     │ ║
║  │  "Soluciones probadas y reutilizables"                          │ ║
║  │  Patrones Canónicos · Primitivas DDD · Result Pattern          │ ║
║  └──────────────────────────┬──────────────────────────────────────┘ ║
║                             │                                         ║
║  ┌──────────────────────────▼──────────────────────────────────────┐ ║
║  │ CAPA DE EVIDENCIA                               [TODOS LOS ROLES│ ║
║  │  "Funciona — aquí está la prueba"                               │ ║
║  │  UMS (producto ejecutable) · Matriz de Trazabilidad · Runbooks │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 4. El Viaje Arquitectónico Progresivo

```
 NECESIDAD DE NEGOCIO   ETAPA ARQUITECTÓNICA      ARTEFACTOS EVOLITH
 ────────────────────   ────────────────────       ──────────────────

 ┌─────────────────┐    ┌──────────────────┐      ADR-0047
 │ Nueva idea de   │──▶ │ Monolito Simple  │      Checklist Simplicidad
 │ producto        │    └────────┬─────────┘      Blueprint Fase 01
 └─────────────────┘             │
                                 │ crece el equipo,
                                 │ se multiplican los dominios
                                 ▼
                        ┌──────────────────┐      ADR-0001 (Nx)
                        │ Monolito Modular │      ADR-0002 (Hexagonal)
                        │  [POR DEFECTO]   │      ADR-0031 (Schema/Ctx)
                        └────────┬─────────┘      Manifiesto de Ingeniería
                                 │
                                 │ criterio 2-de-4
                                 │ (ADR-0045)
                                 ▼
                        ┌──────────────────┐      ADR-0006 (Dapr)
                        │   Módulos        │      ADR-0033 (Outbox)
                        │  Distribuidos    │      ADR-0035 (Sagas)
                        └────────┬─────────┘      TE-04, TE-05
                                 │
                                 │ la complejidad
                                 │ operacional lo justifica
                                 ▼
                        ┌──────────────────┐      ADR-0046 (Dapr OTel)
                        │  Microservicios  │      ADR-0055 (Microfrontends)
                        │ [NORTH STAR]     │      ADR-0013 (Cloud/DR)
                        └──────────────────┘      Escenarios Multi-Cloud
```

**Insight clave para toda audiencia:** No necesitas entender las cuatro etapas a la vez. Empieza por la etapa en la que está tu producto hoy.

---

## 5. Mapa de Capacidades

```
┌─────────────────────────────────────────────────────────────────────┐
│                 MAPA DE CAPACIDADES EVOLITH                         │
├──────────────────┬──────────────────┬─────────────────┬────────────┤
│  CAPACIDADES     │  CAPACIDADES DE  │  CAPACIDADES    │ OPERACIONES│
│  ARQUITECTÓNICAS │  INGENIERÍA      │  DE ENTREGA     │            │
├──────────────────┼──────────────────┼─────────────────┼────────────┤
│ ✓ Ruta de        │ ✓ Baseline       │ ✓ Etapas SDLC   │ ✓ Trazado  │
│   evolución      │   SOLID/Clean    │   definidas     │   OTel     │
│   progresiva     │   Code           │                 │            │
│                  │                  │                 │            │
│ ✓ Multi-tenancy  │ ✓ Toolkit DDD    │ ✓ Definition    │ ✓ Grafana  │
│   RLS dual-layer │   táctico        │   of Done       │   dashbrd  │
│                  │                  │                 │            │
│ ✓ Modelo Zero-   │ ✓ Lista negra    │ ✓ Estándar      │ ✓ Loki     │
│   trust de       │   anti-patrones  │   escritura de  │   logging  │
│   seguridad      │                  │   stories       │            │
│                  │                  │                 │            │
│ ✓ Multi-runtime  │ ✓ Pirámide de    │ ✓ Ramas         │ ✓ Runbooks │
│   políglota      │   testing 70%    │   Gitflow       │   (RB 1-4) │
│                  │                  │                 │            │
│ ✓ Arquitectura   │ ✓ Convenciones   │ ✓ Quality gates │ ✓ Failover │
│   event-driven   │   de nombres     │   CI/CD         │   DB       │
│                  │                  │                 │            │
│ ✓ API design     │ ✓ Patrones       │ ✓ Proceso de    │ ✓ Recovery │
│   contract-first │   canónicos      │   revisión ADR  │   caché    │
├──────────────────┴──────────────────┴─────────────────┴────────────┤
│      Todas las capacidades son runtime-agnósticas por defecto.     │
│   Los perfiles Node.js / .NET / Android agregan tooling concreto.  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Estrategia de Comunicación por Audiencia

### 6.1 Mensaje por Audiencia

#### Para Ejecutivos / Sponsors
**Mensaje central:** "Evolith previene el caos arquitectónico a medida que la empresa crece. Es el contrato técnico que protege la inversión."

Puntos clave:
- 57+ decisiones arquitectónicas prevalidadas = menor riesgo a nivel directivo
- Ruta de 3 fases = costo y cronograma predecibles
- UMS demuestra que el modelo funciona hoy en producción
- El Architecture Board asegura gobernanza sin burocracia

**Entrada recomendada:** Directivas Arquitectónicas → Roadmap Evolutivo → Matriz de Madurez

---

#### Para Arquitectos / Tech Leads
**Mensaje central:** "Cada decisión está documentada, justificada y es aplicable. Heredas un conjunto curado de estándares y los extiendes con ADRs locales."

Puntos clave:
- 57 ADRs agnósticos + específicos de runtime con contexto/decisión/consecuencias
- Criterios claros de extracción que previenen splits prematuros (ADR-0045)
- Modelo de herencia para repositorios hijos con rutas de divergencia documentadas
- Proceso de revisión del Architecture Board para promociones upstream

**Entrada recomendada:** Hub de Arquitectura → Registro ADR → Blueprint de Referencia

---

#### Para Desarrolladores Backend / Frontend
**Mensaje central:** "No necesitas leer todo. Tu perfil de runtime te dice exactamente qué ADRs y patrones te aplican."

Puntos clave:
- Empieza con el Manifiesto de Ingeniería (7 principios, 5 anti-patrones)
- Elige tu perfil de runtime: Node.js, .NET o Android
- Aplica los patrones canónicos (CP-01..08) para escenarios frecuentes
- UMS muestra código real funcional que sigue cada regla

**Entrada recomendada:** Manifiesto de Ingeniería → perfil ADR de runtime → implementación de referencia UMS

---

#### Para QA / SDET
**Mensaje central:** "La calidad está automatizada y aplicada en cada etapa. Tu trabajo es verificar contratos, no cazar bugs."

Puntos clave:
- Pirámide de testing con gate de 70% de cobertura en CI
- Guía de Contract Testing (basada en Pact)
- ADR de Integración y E2E (ADR-0053)
- Testcontainers para tests de integración aislados
- Los Technical Enablers de UMS muestran los patrones de implementación de tests

**Entrada recomendada:** ADR Pirámide de Testing (0018) → Guía Contract Testing → ADR Estrategia de Integración (0053)

---

#### Para DevOps / SRE
**Mensaje central:** "La infraestructura es un detalle reemplazable. La plataforma está diseñada primero para OSS self-hosted, siempre con portabilidad cloud."

Puntos clave:
- ADR de infraestructura OSS self-hosted (0028)
- Stack OTel + Loki + Tempo + Grafana
- Gitflow con gates CI/CD semánticos
- 4 runbooks cubriendo los escenarios operacionales más críticos
- Escenarios de despliegue multi-cloud

**Entrada recomendada:** Hub de Infraestructura → Hub de Operaciones → ADR-0028 → Runbooks

---

#### Para Proveedores / Integradores Externos
**Mensaje central:** "Tu integración debe respetar nuestros contratos. Usamos APIs explícitas y versionadas. No aceptamos vendor lock-in dentro de nuestro dominio."

Puntos clave:
- Contract-first: OpenAPI (REST público), Protobuf/gRPC (interno), AsyncAPI (eventos)
- Adaptadores para cada dependencia externa — sin imports directos de SDK dentro del dominio
- La checklist de Vendor Risk Assessment debe completarse antes de aprobación
- Feature flagging permite rollout gradual sin acoplamiento al core

**Entrada recomendada:** Línea Base Agnóstica → ADR-0040 (Contratos Multi-Runtime) → Vendor Risk Assessment

---

## 7. Modelo Mental: Los Tres Círculos (Hexagonal Simplificado)

```
         ┌──────────────────────────────────┐
         │         INFRAESTRUCTURA          │
         │   (BDs, APIs, Cloud, UI)         │
         │   ┌──────────────────────────┐   │
         │   │       APLICACIÓN         │   │
         │   │   (Casos de Uso, CQRS,   │   │
         │   │    Orquestación)         │   │
         │   │   ┌──────────────────┐   │   │
         │   │   │     DOMINIO      │   │   │
         │   │   │  (Reglas, Ent.,  │   │   │
         │   │   │   Value Objects) │   │   │
         │   │   │  ← PROTEGIDO →   │   │   │
         │   │   └──────────────────┘   │   │
         │   └──────────────────────────┘   │
         └──────────────────────────────────┘
                         ▲
          Las dependencias apuntan hacia ADENTRO.
       La Infraestructura conoce la Aplicación.
       La Aplicación conoce el Dominio.
       El Dominio NO CONOCE NADA fuera de sí mismo.
```

---

## 8. Modelo de Gobernanza

### 8.1 Quién Posee Qué

```
┌─────────────────────────────────────────────────────────────┐
│            ESTRUCTURA DE GOBERNANZA EVOLITH                 │
├─────────────────────┬───────────────────────────────────────┤
│ ENTE                │ RESPONSABILIDAD                       │
├─────────────────────┼───────────────────────────────────────┤
│ Architecture Board  │ Aprueba ADRs, posee la línea base     │
│                     │ Evolith, arbitra disputas inter-equipo │
├─────────────────────┼───────────────────────────────────────┤
│ Arquitecto de       │ Posee ADRs del repositorio hijo,      │
│ Producto (por prod.)│ documenta divergencias, nomina        │
│                     │ promociones                           │
├─────────────────────┼───────────────────────────────────────┤
│ Tech Lead           │ Aplica cumplimiento en entrega diaria │
│ (por squad)         │ revisa PRs contra restricciones ADR   │
├─────────────────────┼───────────────────────────────────────┤
│ Todos los Ingenieros│ Siguen los estándares; plantean issues │
│                     │ vía propuestas ADR, no workarounds    │
└─────────────────────┴───────────────────────────────────────┘
```

---

## 9. Roadmap de Adopción Progresiva

### Para un equipo de producto nuevo que parte desde Evolith:

```
SEMANAS 1-2: ORIENTACIÓN
────────────────────────
□ Leer las Directivas Arquitectónicas (visión)
□ Leer el Manifiesto de Ingeniería (reglas)
□ Leer la Línea Base Agnóstica (no negociables)
□ Leer la Guía de Herencia para Repositorios Hijos
□ Clonar la estructura de taxonomía del repositorio

SEMANAS 3-4: FUNDACIÓN
──────────────────────
□ Seleccionar perfil de runtime (Node.js / .NET / Android)
□ Leer los ADRs específicos de runtime para tu stack
□ Estudiar los bounded contexts de UMS como referencia
□ Configurar monorepo Nx + gates de linting
□ Escribir el primer ADR del producto documentando la primera divergencia

SEMANAS 5-8: PRIMERA ENTREGA (Fase 1 - Monolito Modular)
─────────────────────────────────────────────────────────
□ Aplicar Arquitectura Hexagonal (Puertos + Adaptadores)
□ Definir modelo de base de datos — un esquema único (enfoque SOA) es válido en
  la Fase 1; schema-per-context es opcional y puede introducirse progresivamente
  a medida que los límites del dominio se consoliden (ADR-0031 gobierna cuándo adoptarlo)
□ Implementar pirámide de testing (gate 70% cobertura)
□ Configurar observabilidad OTel + Loki + Grafana
□ Seguir estrategia de ramas Gitflow
□ Implementar Transactional Outbox para escrituras asíncronas

MES 3+: ESCALA (Fase 2 — cuando las métricas lo justifiquen)
─────────────────────────────────────────────────────────────
□ Ejecutar checklist de criterios ADR-0045
□ Extraer primer servicio solo si se cumplen 2-de-4 criterios
□ Activar RLS nativo a nivel de base de datos
□ Habilitar trazado distribuido completo
□ Integrar Dapr para abstracción de service mesh

FUTURO: NORTH STAR (Fase 3 — decisión deliberada)
──────────────────────────────────────────────────
□ Orquestación multi-cloud
□ Arquitectura event-driven a escala
□ Aplicación de red Zero-trust
□ Compliance-as-Code en pipelines CI
```

---

## 10. El Insight Más Importante

> **La complejidad en estos repositorios no es un problema de documentación — es un reflejo preciso de la arquitectura empresarial real.**
>
> La solución no es simplificar el contenido.
> La solución es **exponerlo progresivamente**, comenzando con la visión de negocio,
> y dejando que cada audiencia profundice tan lejos como su rol requiere.
>
> Evolith ya tiene esta estructura. La pieza faltante es una **capa de entrada clara** —
> una página única que diga "esto es qué es, esto es por qué existe, aquí empieza".
>
> Eso es lo que este documento aporta, y lo que el Executive One-Pager (ver § 12 en la versión EN) debería entregar visualmente.

---

## Referencias

- [Directivas Arquitectónicas](../vision/../../standards-es/vision/architectural-directives.md)
- [Roadmap Evolutivo](../vision/../../standards-es/vision/evolutionary-strategy-roadmap.md)
- [Manifiesto de Ingeniería](../engineering/../../standards-es/engineering/engineering-manifesto.md)
- [Blueprint de Referencia](../../../architecture/blueprints-es/reference-blueprint.md)
- [Registro ADR](../../../architecture/adrs-es/README.md)
- [Hub de Referencia UMS](../../../knowledge/demo/README.es.md)
- [Guía de Herencia para Repositorios Hijos](../onboarding/child-repository-inheritance-guide.es.md)
- [Taxonomía del Repositorio](../repository-taxonomy.es.md)

---

<div align="center">
  <sub>Evolith — Plataforma de Arquitectura Empresarial | Estrategia de Comunicación Arquitectónica</sub>
</div>
