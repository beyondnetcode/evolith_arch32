# Asistente AI de Arquitectura Evolith — Estrategia y Plan de Trabajo

> **Navegación bilingüe:** [English](./ai-architecture-assistant-strategy.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Aprobado para Adopción Incremental  
> **Última revisión:** 2026-05-27

---

## 1. Visión

### 1.1 La Idea Central

> **Cada agente AI de codificación que toca software corporativo debe razonar como si el Arquitecto Principal estuviera en la sala.**

La base de conocimiento de Evolith — 57+ ADRs, blueprints, patrones canónicos, reglas DDD, estándares SDLC, políticas de gobernanza, convenciones de nombres y estándares de observabilidad — se convierte en la **memoria de nivel empresarial** de cada asistente AI en la organización.

Esto no se trata de construir un chatbot. Se trata de hacer que los estándares arquitectónicos sean **autoaplicables** a través de IA — de modo que sin importar qué herramienta use un desarrollador, proveedor o agente (Claude, Copilot, Cursor, Codex, Roo, Cline, Continue), siempre reciban sugerencias, rechazos y explicaciones alineados con la arquitectura.

### 1.2 La Persona de Arquitecto Principal

El Asistente AI de Arquitectura opera como una persona de **Arquitecto Principal** con cuatro modos de comportamiento:

```
┌─────────────────────────────────────────────────────────────────┐
│           ASISTENTE AI DE ARQUITECTURA EVOLITH                  │
│                   "Arquitecto Principal"                        │
├─────────────────┬───────────────────────────────────────────────┤
│ MODO            │ COMPORTAMIENTO                                │
├─────────────────┼───────────────────────────────────────────────┤
│ 🧭 GUIAR        │ Explica proactivamente el enfoque             │
│                 │ arquitectónico correcto antes de escribir     │
│                 │ código                                        │
├─────────────────┼───────────────────────────────────────────────┤
│ ✅ VALIDAR      │ Revisa el código generado contra ADRs y       │
│                 │ estándares; señala violaciones con citas       │
├─────────────────┼───────────────────────────────────────────────┤
│ 🔍 CONSULTAR    │ Responde "¿qué ADR rige X?" o                 │
│                 │ "¿cuál es el patrón canónico para Y?"         │
├─────────────────┼───────────────────────────────────────────────┤
│ 🚫 BLOQUEAR     │ Rechaza sugerencias que violan               │
│                 │ restricciones no negociables (guardrails duros)│
└─────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Estrategia de Ingestión de Conocimiento

### 2.1 La Pirámide de Conocimiento

```
                        ┌─────────────────┐
                        │ CONTEXTO VIVO   │  ← Archivo actual, diff de PR,
                        │  (En-prompt)    │    conversación activa
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   CONOCIMIENTO  │  ← RAG: búsqueda semántica sobre
                        │   RECUPERADO    │    corpus vectorizado de Evolith
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   FUNDAMENTO    │  ← AGENTS.md, system prompt,
                        │   INYECTADO     │    reglas del harness (siempre presentes)
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   CONOCIMIENTO  │  ← Modelo ajustado o
                        │   ENTRENADO     │    conocimiento base cacheado
                        └─────────────────┘
```

### 2.2 Pipeline de Ingestión

```
REPOSITORIO EVOLITH                   BASE DE CONOCIMIENTO AI
───────────────────                   ──────────────────────

reference/architecture/adrs/          ┌─────────────────────┐
  archivos *.md (57+ ADRs)  ────────▶ │  ADR Vector Store   │
                                       │  (por sección       │
reference/architecture/                │   + etiquetas meta) │
  blueprints/*.md           ────────▶ │  Blueprint Store    │
                                       └─────────────────────┘
reference/governance/
  standards/**/*.md         ────────▶ ┌─────────────────────┐
                                       │  Standards Store    │
reference/architecture/                │  (reglas de         │
  canonical-patterns/*.md   ────────▶ │   aplicación +      │
                                       │   ejemplos de código)│
                                       └─────────────────────┘
AGENTS.md / .harness/rules/ ────────▶ ┌─────────────────────┐
  global-rules.md                      │  System Prompt Core │
                                       │  (siempre inyectado)│
                                       └─────────────────────┘
```

### 2.3 Estrategia de Chunking por Tipo de Artefacto

| Artefacto | Unidad de chunk | Etiquetas de metadata | Disparador de recuperación |
|---|---|---|---|
| ADR | Un chunk por sección (Contexto / Decisión / Consecuencias) | `adr_id`, `runtime`, `phase`, `domain`, `status` | "¿cómo hago…", "¿qué ADR…", "¿debería usar…" |
| Blueprint | Un chunk por nivel C4 / diagrama | `layer`, `component`, `runtime` | "¿cómo conecta X con Y", "cuál es la topología" |
| Patrón Canónico | Patrón completo como chunk único | `pattern_name`, `runtime`, `adr_ref`, `phase` | "muéstrame el patrón para…", "cómo implementar…" |
| Estándar de Ingeniería | Un chunk por regla/principio | `standard_type`, `enforcement`, `severity` | "¿está permitido esto", "valida este código" |
| Convención de Nombres | Tabla completa de convenciones | `runtime`, `layer`, `artifact_type` | "¿cómo debería nombrar…", "¿es correcto este nombre" |
| Política de Gobernanza | Un chunk por ítem de política | `policy_type`, `mandatory`, `board_approval` | "¿necesito aprobación para…", "¿cuál es el proceso" |
| SDLC / DoD | Un chunk por checklist de etapa | `phase`, `role`, `gate_type` | "¿está listo para ship", "¿cuál es el DoD" |

### 2.4 Diseño del Índice Semántico

Cada chunk de documento se almacena con un sobre de metadata estructurado:

```json
{
  "chunk_id": "adr-0002-decision",
  "source": "reference/architecture/adrs/nodejs/0002-clean-architecture-nestjs.md",
  "artifact_type": "ADR",
  "adr_id": "0002",
  "section": "decision",
  "runtime": ["nodejs", "typescript"],
  "phase": ["1", "2", "3"],
  "domain": ["architecture", "hexagonal", "clean-architecture"],
  "status": "approved",
  "severity": "mandatory",
  "keywords": ["hexagonal", "ports", "adapters", "nestjs", "boundaries"],
  "last_updated": "2026-05-27",
  "version": "1.0"
}
```

Este sobre habilita la **recuperación filtrada** — el agente consulta por runtime, fase y dominio antes de llegar a la búsqueda de similitud vectorial, reduciendo dramáticamente el riesgo de alucinaciones.

---

## 3. Cómo se Expone Cada Tipo de Conocimiento a la IA

### 3.1 ADRs → Contexto de Decisión

Los ADRs son el artefacto más crítico. La IA debe poder:
- Citar el ADR al hacer una sugerencia
- Explicar por qué se tomó la decisión (sección de contexto)
- Listar las consecuencias (trade-offs)
- Apuntar al ADR que lo reemplaza si corresponde

**Patrón de prompt para recuperación de ADR:**
```
Cuando un desarrollador pregunta sobre [TEMA], recuperar los ADR(s) relevantes y:
1. Indicar qué ADR lo rige (con ID y título)
2. Resumir la decisión en una oración
3. Explicar el trade-off principal
4. Si la pregunta implica una violación, explicar por qué y citar la restricción
```

### 3.2 Reglas DDD → Protección del Dominio

```
REGLA: La capa de dominio no tiene importaciones de infraestructura.

Patrón de aplicación AI:
- DETECTAR: Cualquier importación de ORM, HTTP, SDK o biblioteca de
  persistencia dentro de una clase que hereda de AggregateRoot,
  Entity o ValueObject
- BLOQUEAR: "Esto viola ADR-0002 (Arquitectura Hexagonal). La capa
  de dominio no debe importar [biblioteca detectada]. Mueve esta
  lógica a un adaptador de infraestructura que implemente
  [interfaz de puerto sugerida]."
- SUGERIR: Generar la interfaz de Puerto correcta + esqueleto del Adaptador
```

### 3.3 Estándares de Codificación → Validación en Tiempo Real

| Estándar | Comportamiento AI | Severidad |
|---|---|---|
| Principios SOLID | Señalar violaciones en modo revisión de PR | Advertencia |
| Sin God Classes | Detectar si la clase tiene >3 responsabilidades | Error |
| Sin SQL crudo en dominio | Bloquear cualquier `SELECT` dentro de clases de dominio | Bloqueo duro |
| Convenciones de nombres (ADR-0056) | Validar nombres contra el glosario de Lenguaje Ubicuo | Advertencia |
| Sin `^` o `~` en dependencias | Detectar en package.json/csproj, corregir automáticamente | Auto-corrección |
| Cobertura de tests ≥70% | Advertir si código nuevo reduce la cobertura | Advertencia |
| Patrón Result para manejo de errores | Sugerir cuando se usa try/catch en dominio | Sugerencia |

### 3.4 Patrones de Arquitectura → Guía Generativa

Los patrones canónicos (CP-01..08) se exponen como **plantillas de generación de código**:

```
CONSULTA: "Necesito implementar un repositorio para datos con aislamiento por tenant"

RESPUESTA AI:
→ Recupera: CP-04 (Repositorio RLS Multi-Tenant)
→ Genera: Scaffold del patrón adaptado al runtime actual
→ Cita: ADR-0010 (Multi-Tenancy), ADR-0044 (Seguridad Configurable)
→ Advierte: "Recuerda inyectar TenantContext via SESSION_CONTEXT —
             nunca hardcodear tenant_id en las consultas"
```

### 3.5 Políticas de Gobernanza → Enrutamiento de Aprobaciones

```
ÁRBOL DE APLICACIÓN DE POLÍTICAS:

¿Nueva herramienta/librería propuesta por AI o desarrollador?
  → Verificar Catálogo de Herramientas Aprobadas (03-tools-catalog)
  → Si no está listada: "Esta herramienta requiere aprobación ADR del
    Architecture Board antes de su adopción. Usa [alternativa del
    catálogo] en su lugar."

¿Nuevo patrón arquitectónico no está en el registro ADR?
  → "Este patrón no está en el registro ADR de Evolith. Crea una
    propuesta ADR en reference/architecture/adrs/[runtime]/ siguiendo
    la plantilla, luego solicita revisión del Board."

¿Detected cross-schema SQL join?
  → "Violación dura de ADR-0031 (Schema-per-Context). Esto está
    prohibido arquitectónicamente. Expone datos via eventos de
    dominio o un contrato de API explícito."
```

### 3.6 Reglas de Seguridad → Guardrails de Tolerancia Cero

```
BLOQUEOS DUROS (la IA nunca debe generar ni aprobar):
  × Importaciones de SDK (AWS, Azure, etc.) fuera de adaptadores de infraestructura
  × SQL crudo con concatenación de cadenas (riesgo de SQL injection)
  × Secrets o credenciales hardcodeadas en cualquier capa
  × Acceso a datos cross-tenant sin validación de SESSION_CONTEXT
  × Procedimientos almacenados con lógica de negocio (violación de ADR)
  × Acceso directo a base de datos desde controladores o casos de uso

ADVERTENCIAS SUAVES (la IA señala y explica):
  ~ Falta de validación de entrada OWASP en DTOs
  ~ Falta de rate limiting en endpoints públicos
  ~ Falta de correlation_id en instrucciones de log
  ~ Expiración JWT mayor a 1 hora sin estrategia de refresh
```

### 3.7 Estándares de Observabilidad → Guía de Auto-instrumentación

```
DISPARADOR: Se crea un nuevo método de servicio

COMPORTAMIENTO AI:
1. Verificar si se agregó un span de OpenTelemetry
2. Verificar si hay un log estructurado con correlation_id
3. Verificar si la excepción se captura y loguea con contexto de traza
4. Si falta: sugerir código de instrumentación OTel siguiendo
   ADR-0007 (OTel + Loki) con headers W3C TraceContext
```

### 3.8 Estándares de Testing → Guardián de Cobertura

```
DISPARADOR: Generación de código o revisión de PR

COMPORTAMIENTO AI:
1. Generar unit test junto a cada nuevo caso de uso (ADR-0052)
2. Sugerir test de integración Testcontainers para implementaciones
   de repositorios
3. Recordar: "Este caso de uso tiene dependencias externas — agrega
   un contract test según la Guía de Contract Testing"
4. Bloquear sugerencia de merge de PR si la cobertura estimada
   cae por debajo del 70%
```

---

## 4. Framework de Razonamiento del Agente AI

### 4.1 La Cadena de Razonamiento Arquitectónico de 5 Pasos

Cada agente AI involucrado en decisiones arquitectónicas sigue esta cadena de razonamiento antes de generar output:

```
PASO 1 — CLASIFICACIÓN DE CONTEXTO
  Determinar: ¿Es esto una preocupación de dominio, aplicación o infraestructura?
  Regla: Las preocupaciones de dominio no permiten acoplamiento de infraestructura.

PASO 2 — BÚSQUEDA DE ADR
  Consulta: ¿Qué ADRs rigen esta preocupación?
  Acción: Recuperar los 3 ADRs más relevantes por similitud semántica + filtro de metadata.

PASO 3 — CONCIENCIA DE FASE
  Determinar: ¿En qué fase Evolith está este producto? (1, 2, o 3)
  Regla: Nunca sugerir patrones de Fase 3 para un producto en Fase 1.

PASO 4 — VERIFICACIÓN DE RESTRICCIONES
  Validar: ¿La solución propuesta viola alguna restricción dura?
  Si SÍ → Bloquear y explicar.
  Si NO → Proceder con la generación.

PASO 5 — CITACIÓN
  Cada sugerencia DEBE incluir:
  - Qué ADR(s) la autorizan
  - A qué fase pertenece
  - Si es obligatorio u opcional
```

### 4.2 Niveles de Confianza

```
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 1 — AUTORIZADO (ADR existe, aprobado, obligatorio)   │
│  IA responde con plena confianza + cita del ADR             │
│  Ejemplo: "Usar Arquitectura Hexagonal. Ver ADR-0002."      │
├─────────────────────────────────────────────────────────────┤
│  NIVEL 2 — GUIADO (Estándar existe, sin ADR explícito)      │
│  IA responde con recomendación + cita del estándar          │
│  Ejemplo: "El Manifiesto de Ingeniería §3 prohíbe           │
│  God Classes."                                              │
├─────────────────────────────────────────────────────────────┤
│  NIVEL 3 — INFERIDO (Sin regla explícita, derivado          │
│  del patrón)                                                │
│  IA responde con sugerencia + flag de incertidumbre         │
│  explícita                                                  │
│  Ejemplo: "No existe ADR para esto. Se recomienda revisar   │
│  con el Architecture Board antes de proceder."              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Ecosistema de Agentes — Roles y Responsabilidades

### 5.1 La Arquitectura Multi-Agente

```
                    ┌─────────────────────────────┐
                    │     AGENTE ORQUESTADOR       │
                    │  Enruta consultas al agente  │
                    │  especialista correcto        │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │              │           │            │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─▼──────────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  ARCHITECT   │ │  REVIEWER  │ │   CODER    │ │    QA      │ │  DEVOPS    │
│  AGENT       │ │  AGENT     │ │   AGENT    │ │   AGENT    │ │  AGENT     │
│              │ │            │ │            │ │            │ │            │
│ Búsqueda ADR │ │ Rev. PR    │ │ Gen. código│ │ Gen. tests │ │ Pipeline   │
│ Rec. patrón  │ │ Cumplimient│ │ Scaffold   │ │ Contrato   │ │ IaC infra  │
│ Consejo fase │ │ Validación │ │ patrón     │ │ Cobertura  │ │ Setup OTel │
│ Reglas Board │ │ Bloq. duro │ │ Refactor   │ │ Gates QA   │ │ Runbooks   │
└──────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### 5.2 Perfiles de Agentes

#### Architect Agent
- **Conoce:** Todos los ADRs, blueprints, políticas de gobernanza, criterios de fase
- **Puede:** Responder "¿qué ADR?", proponer nuevos ADRs, evaluar preparación para extracción, explicar decisiones arquitectónicas
- **Integra con:** Claude, GitHub Copilot Chat, panel AI de Cursor
- **Aprobación humana requerida:** Antes de que cualquier nuevo ADR sea commiteado

#### Reviewer Agent
- **Conoce:** Manifiesto de Ingeniería, lista negra de anti-patrones, convenciones de nombres, reglas de seguridad
- **Puede:** Revisar PRs, señalar violaciones con citas, bloquear merge en violaciones duras, generar reportes de revisión
- **Integra con:** GitHub Actions (revisión automatizada de PR), CodeQL, PR Summaries de Copilot
- **Aprobación humana requerida:** La decisión final de merge siempre permanece con el Tech Lead

#### Coder Agent
- **Conoce:** Patrones canónicos, ADRs de runtime, estándares de codificación, reglas Hexagonales
- **Puede:** Generar scaffolding siguiendo patrones canónicos, implementar casos de uso, crear pares puerto+adaptador, escribir boilerplate según estándar
- **Integra con:** Cursor, Cline, Roo, Continue, Codex, Claude Code
- **Aprobación humana requerida:** Antes de commitear cualquier código generado

#### QA Agent
- **Conoce:** Estándares de pirámide de testing, guía de contract testing, ADR-0018/0052/0053
- **Puede:** Generar unit tests, sugerir contract tests, verificar cobertura, señalar escenarios de tests de integración faltantes
- **Integra con:** GitHub Actions, Copilot, Cline
- **Aprobación humana requerida:** Antes de mergear tests que cambien definiciones de contrato

#### DevOps Agent
- **Conoce:** ADR-0028 de infraestructura, estándares OTel, Gitflow, gates de calidad CI/CD, runbooks
- **Puede:** Generar IaC para stack OSS-first, configurar pipelines OTel, validar gates de calidad del pipeline, redactar entradas de runbook
- **Integra con:** GitHub Actions, Harness Platform, Terraform/Pulumi
- **Aprobación humana requerida:** Antes de que cualquier cambio de infraestructura llegue a producción

### 5.3 Asistencia AI por Rol

| Rol | Interacción AI principal | Conocimiento clave inyectado | Guardrails duros |
|---|---|---|---|
| **Arquitecto** | Consultas ADR, guía de patrones, evaluación de fase | Todos los ADRs + blueprints | No puede aprobar ADR que viole restricciones a nivel de Board |
| **Desarrollador** | Generación de código, refactoring, scaffold de patrón | ADRs de runtime + patrones canónicos | No puede generar código de dominio con imports de infra |
| **QA / SDET** | Generación de tests, análisis de cobertura, contract test | ADRs de pirámide de testing + guía de contrato | No puede reducir cobertura de tests por debajo del 70% |
| **DevOps / SRE** | Generación IaC, config de pipeline, borrador de runbook | ADRs de infra + estándares OTel | No puede generar SDK propietario sin wrapper adaptador |
| **Product Owner** | Revisión de historias, verificación de límite de alcance | Estándar SDLC + DoD | No puede aprobar historias que eviten la revisión arquitectónica |
| **Proveedor / Vendor** | Validación de contrato, checklist de integración | Baseline agnóstico + ADRs de contrato | No puede integrar sin completar el Vendor Risk Assessment |

---

## 6. Guardrails y Gobernanza

### 6.1 Las Tres Capas de Guardrails

```
CAPA 1 — SYSTEM PROMPT (Siempre activo, inyectado por harness)
  Contenido: Identidad Evolith, principios fundamentales, bloqueos duros, contexto de fase
  Alcance: Cada sesión AI que toca código corporativo
  Sobrescribir: Imposible sin aprobación del Architecture Board

CAPA 2 — GUARDRAILS RAG (Recuperados bajo demanda)
  Contenido: Restricciones ADR específicas, reglas de patrones, violaciones de estándares
  Alcance: Sensible al contexto — se activa cuando se detecta el dominio relevante
  Sobrescribir: Requiere excepción ADR documentada

CAPA 3 — GATES CI/CD (Validación post-generación)
  Contenido: Reglas de linting, verificaciones de frontera, gates de cobertura, scan de seguridad
  Alcance: Cada commit y PR — el output de IA se trata igual que el output humano
  Sobrescribir: Imposible — automatizado y no evitable
```

### 6.2 Política Human-in-the-Loop

Extiende **ADR-AI-005 (Política Human-in-the-Loop)**:

| Acción | Autonomía AI | Humano requerido |
|---|---|---|
| Sugerencia de código en IDE | Autonomía total | El desarrollador revisa antes de aceptar |
| Revisión automatizada de PR | Autonomía total | El Tech Lead toma la decisión final de merge |
| Borrador de nuevo ADR | AI redacta, arquitecto revisa | El Architecture Board vota |
| Generación de patrón de arquitectura | AI genera scaffold | El desarrollador revisa antes de commitear |
| Cambio de infra (staging) | AI genera, DevOps revisa | DevOps aprueba |
| Cambio de infra (producción) | AI genera, DevOps revisa | Engineering Manager aprueba |
| Sobrescribir bloqueo duro | AI no puede sobrescribir | Solo Architecture Board |

### 6.3 Validación de Cumplimiento de Código Generado por IA

Todo código generado por IA pasa por esta cadena de validación automatizada antes de poder ser commiteado:

```
AI genera código
      │
      ▼
[GATE 1] eslint-plugin-boundaries
  → Bloquear si el dominio importa infraestructura
  → Bloquear si hay violación de dependencia entre módulos

[GATE 2] Reglas de linter con conciencia arquitectónica
  → Validar nombres contra ADR-0056 / glosario de Lenguaje Ubicuo
  → Validar responsabilidades de clase (sin God Classes)

[GATE 3] Análisis estático de seguridad
  → Escanear secrets hardcodeados
  → Escanear patrones de SQL injection
  → Escanear validación de entrada faltante

[GATE 4] Verificación de cobertura de tests
  → Estimar impacto en cobertura
  → Bloquear si la cobertura proyectada < 70%

[GATE 5] Verificación de cita de ADR (nuevo — específico de IA)
  → Verificar que las decisiones arquitectónicas generadas por IA citen un ADR
  → Señalar elecciones arquitectónicas no documentadas para revisión del Board

Todos los gates PASAN → Commit permitido
Cualquier gate FALLA → Commit bloqueado + explicación devuelta al agente AI
```

### 6.4 Memoria Arquitectónica Versionada

La base de conocimiento AI está **versionada junto al codebase**:

```
Versión del repositorio Evolith  →  Snapshot de base de conocimiento
──────────────────────────────────────────────────────────────────
rama main                         →  Últimos estándares aprobados
etiqueta v1.0                     →  Estándares a partir del release v1.0
feature/new-adr                   →  Estándares borrador (modo revisión)
```

**Regla:** Un repositorio de producto en los ADRs de Evolith v1.x debe usar el snapshot de conocimiento v1.x. Actualizar a los ADRs v2.x requiere un ADR de migración explícito en el repositorio hijo.

---

## 7. Estrategia de Prompt Engineering

### 7.1 Plantilla de System Prompt (Capa Base)

```markdown
# Arquitecto Principal Evolith — System Prompt

Eres el Arquitecto Principal de este codebase, operando bajo el
estándar de arquitectura corporativa Evolith.

## Tu Identidad
- Aplicas los estándares de arquitectura Evolith en todo momento
- Citas los ADRs por ID al tomar o evaluar decisiones
- Nunca generas código que viole las restricciones duras abajo
- Siempre indicas a qué fase (1/2/3) pertenece una recomendación
- Distingues entre estándares obligatorios y opcionales

## Contexto Actual
- Fase del producto: {{FASE}}
- Runtime: {{RUNTIME}}
- Bounded context: {{CONTEXTO}}

## Restricciones Duras (No negociables)
1. La capa de dominio NO DEBE importar librerías de infraestructura
2. Sin SQL crudo dentro de capas de dominio o aplicación
3. Sin secrets hardcodeados en ningún lado
4. Sin joins SQL cross-schema (ADR-0031)
5. Sin extracción a microservicio sin 2 de 4 criterios (ADR-0045)
6. Todas las integraciones externas DEBEN pasar por la frontera Puerto/Adaptador

## Cuando No Sabes
Si ningún ADR rige una situación, dilo explícitamente y recomienda
crear uno en lugar de improvisar una solución.
```

### 7.2 Overlays de Prompt por Rol

**Overlay para desarrollador:**
```markdown
Enfoque en: Generación de código siguiendo patrones canónicos.
Siempre incluir: Cita del ADR, etiqueta de fase, scaffold de test.
Nunca: Sugerir cambios arquitectónicos sin revisión del arquitecto.
```

**Overlay para revisor:**
```markdown
Enfoque en: Validación de cumplimiento contra el registro ADR.
Formato: Tabla de violaciones (Regla | ADR | Severidad | Corrección sugerida).
Nunca: Aprobar código que viole restricciones duras.
```

**Overlay para arquitecto:**
```markdown
Enfoque en: Razonamiento de decisiones, análisis de trade-offs, planificación de fases.
Formato: Borrador de ADR estructurado al proponer nuevas decisiones.
Siempre: Referenciar ADRs existentes antes de proponer nuevos.
```

### 7.3 Plantilla de Inyección de Contexto por Herramienta

| Herramienta | Método de inyección | Archivo | Contenido |
|---|---|---|---|
| Claude Code | `AGENTS.md` + instrucciones de proyecto | `AGENTS.md` | System prompt base + índice ADR |
| GitHub Copilot | `.github/copilot-instructions.md` | raíz del repo | Resumen de reglas arquitectónicas |
| Cursor | `.cursorrules` | raíz del repo | Reglas Evolith + referencia rápida ADR |
| Continue | `.continue/config.json` | raíz del repo | Lista de docs de contexto apuntando a ADRs |
| Cline / Roo | System prompt en config de herramienta | por workspace | Contexto completo de harness + arquitectura |
| Codex | System prompt via API | programático | Contexto en capas por tipo de tarea |

---

## 8. Roadmap de Implementación Incremental

### Fase 0 — Fundación (Semanas 1-4)
**Objetivo:** AGENTS.md + system prompts por herramienta. Asistente de arquitectura mínimo viable.

```
□ Escribir AGENTS.md base para el repositorio Evolith (fundación del harness)
□ Crear .cursorrules con las top-20 reglas arquitectónicas
□ Crear .github/copilot-instructions.md con resumen de ADR
□ Definir esquema de metadata de ADR (sobre JSON por chunk)
□ Etiquetar todos los ADRs existentes con metadata (runtime, phase, domain, severity)
□ Exportar índice de ADR como JSON/YAML legible por máquina
```

### Fase 1 — Base de Conocimiento RAG (Semanas 5-10)
**Objetivo:** Corpus vectorizado, búsqueda semántica, recuperación de ADR en contexto.

```
□ Elegir vector store (Chroma / Qdrant / Pinecone / Azure AI Search)
□ Construir pipeline de ingestión: MD → chunks → embeddings → vector store
□ Implementar recuperación filtrada por metadata
□ Construir servidor MCP que exponga consulta ADR como herramienta (extiende ADR-AI-002)
□ Probar precisión de recuperación: 20 consultas de benchmark vs. ADRs esperados
□ Escribir ADR-AI-006: Gobernanza y Versionado de Base de Conocimiento
```

### Fase 2 — Agentes Especialistas (Semanas 11-18)
**Objetivo:** Architect Agent y Reviewer Agent operacionales.

```
□ Desplegar Architect Agent con búsqueda ADR + recomendación de patrones
□ Desplegar Reviewer Agent con validación de cumplimiento + bloqueos duros
□ Integrar Reviewer Agent en el pipeline de PR de GitHub Actions
□ Construir validador de citas ADR (Gate 5 en la cadena de cumplimiento)
□ Escribir overlays de prompt por rol para desarrollador / QA / DevOps
□ Piloto con un equipo de producto: recolectar métricas (violaciones encontradas, tiempo ahorrado)
```

### Fase 3 — Ecosistema Completo de Agentes (Semanas 19-30)
**Objetivo:** Los 5 agentes especialistas operacionales en todas las herramientas.

```
□ Desplegar Coder Agent con generación de scaffold de patrón canónico
□ Desplegar QA Agent con generación de tests + validación de cobertura
□ Desplegar DevOps Agent con generación de IaC + pipeline OTel
□ Orquestación multi-agente via Harness (ver documento de evaluación Harness)
□ Base de conocimiento versionada sincronizada con etiquetas de release de Evolith
□ Dashboard: tasa de cumplimiento AI, violaciones bloqueadas, ADRs citados
```

### Fase 4 — Gobernanza Empresarial (Semanas 31+)
**Objetivo:** Architecture Board integrado en flujos de aprobación AI.

```
□ Propuestas de ADR redactadas por AI enrutadas al Board via GitHub Issues
□ Auditoría de base de conocimiento: revisión trimestral de sugerencias AI vs. ADRs
□ Onboarding de proveedores: herramientas AI del vendor reciben paquete de conocimiento Evolith
□ Compartición de conocimiento cross-producto: descubrimientos ADR de repos satélite
□ Evaluación de madurez AI usando el framework 07-maturity-model
```

---

## 9. Riesgos y Limitaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| **Citas de ADR alucinadas** | Alto — guía arquitectónica incorrecta | Medio | Gate validador de citas (Fase 1) + fundamentación en recuperación |
| **Base de conocimiento obsoleta** | Medio — reglas desactualizadas aplicadas | Medio | Snapshots versionados + pipeline de sincronización CI |
| **Sobre-restricción** | Bajo — bloquea soluciones válidas | Bajo | Niveles de confianza + flag de incertidumbre Nivel 3 |
| **Límites de ventana de contexto** | Medio — contexto ADR incompleto | Medio | Estrategia de chunking + filtrado de metadata reduce ruido |
| **Dependencia de vendor** | Medio — formatos de prompt específicos de herramienta | Medio | Capa de harness abstracta, adaptadores de herramienta |
| **IA como oráculo** | Alto — equipos dejan de pensar arquitectónicamente | Medio | Política HITL + revisión obligatoria del arquitecto para cambios de ADR |
| **Filtración de conocimiento privado** | Alto — ADRs enviados a IA externa | Bajo | Despliegue privado (Harness self-hosted), clasificación de datos |

---

## Referencias

- [Evaluación de la Plataforma Harness](./harness-platform-evaluation.es.md)
- [Taxonomía de Conocimiento para IA](./knowledge-taxonomy.es.md)
- [Diagramas Visuales del Ecosistema](./visuals/README.es.md)
- [ADR-AI-001: Estrategia de Harness Engineering](../06-adrs/adr-ai-001-harness-strategy.md)
- [ADR-AI-002: MCP como Estándar de Integración](../06-adrs/adr-ai-002-mcp-as-integration-standard.md)
- [ADR-AI-005: Política Human-in-the-Loop](../06-adrs/adr-ai-005-human-in-the-loop-policy.md)
- [Patrones Agénticos](../05-agentic-patterns/patterns-overview.md)
- [Manifiesto de Ingeniería](../../engineering/engineering-manifesto.md)

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Estrategia del Asistente AI de Arquitectura</sub>
</div>
