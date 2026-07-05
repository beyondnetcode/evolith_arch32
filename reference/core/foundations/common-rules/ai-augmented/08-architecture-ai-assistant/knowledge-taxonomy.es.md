# Taxonomía de Conocimiento Evolith para Consumo por IA

> **Navegación bilingüe:** [English](./knowledge-taxonomy.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Aprobado

---

## Propósito

Este documento define **exactamente cómo debe estructurarse cada tipo de artefacto Evolith** para ser ingestado, indexado, recuperado y razonado de forma confiable por agentes de IA. Es la especificación para el pipeline de ingestión de conocimiento.

---

## 1. Registro de Tipos de Artefactos

```
┌─────────────────────────────────────────────────────────────────┐
│           TAXONOMÍA DE CONOCIMIENTO AI EVOLITH                  │
├──────────────────────┬───────────────┬───────────────┬──────────┤
│ TIPO DE ARTEFACTO    │ VOLUMEN       │ PRIORIDAD     │ FASE     │
├──────────────────────┼───────────────┼───────────────┼──────────┤
│ ADRs (Core)          │ 56 docs       │  Crítico    │ 0        │
│ ADRs (Node.js)       │ 14 docs       │  Crítico    │ 0        │
│ ADRs (.NET)          │ 1+ docs       │  Crítico    │ 0        │
│ ADRs (Android)       │ n docs        │ 🟠 Alto       │ 1        │
│ Patrones Canónicos   │ 8 docs        │  Crítico    │ 0        │
│ Manifiesto Ingeniería│ 1 doc         │  Crítico    │ 0        │
│ Conv. de Nombres     │ 1 doc         │  Crítico    │ 0        │
│ Blueprint Referencia │ 1 doc         │  Crítico    │ 0        │
│ Directivas Arquitec. │ 1 doc         │ 🟠 Alto       │ 0        │
│ Glosario             │ 1 doc         │ 🟠 Alto       │ 0        │
│ SDLC / DoD           │ 3 docs        │ 🟠 Alto       │ 1        │
│ Estándares Seguridad │ 2 docs        │ 🟠 Alto       │ 1        │
│ Estándares Testing   │ 3 docs        │ 🟠 Alto       │ 1        │
│ Stack Observabilidad │ 4 docs        │ 🟡 Medio      │ 1        │
│ Blueprints           │ 6 docs        │ 🟡 Medio      │ 1        │
│ Políticas Gobernanza │ 5 docs        │ 🟡 Medio      │ 2        │
│ Visuales Comunicación│ 8 docs        │ 🟡 Medio      │ 2        │
│ Modelo Referencia UMS│ n docs        │ 🟡 Medio      │ 2        │
└──────────────────────┴───────────────┴───────────────┴──────────┘
```

---

## 2. Esquema ADR para Ingestión AI

Cada ADR debe parsearse en este formato estructurado antes de la vectorización:

```yaml
# Esquema de Ingestión AI para ADR
adr_id: "0002"
title: "Clean Architecture con NestJS"
runtime: ["nodejs", "typescript"]
status: "approved"            # approved | proposed | superseded | deprecated
superseded_by: null           # ID del ADR si fue reemplazado
phase: ["1", "2", "3"]        # fases donde aplica
domain: ["architecture", "hexagonal", "nestjs", "boundaries"]
enforcement: "mandatory"      # mandatory | recommended | optional
board_approved: true

# Secciones chunkeadas (cada una se convierte en un embedding separado)
sections:
  context:
    text: "..."
    keywords: ["hexagonal", "ports", "adapters", "nestjs"]
    
  decision:
    text: "..."
    summary_one_line: "Usar Arquitectura Hexagonal con NestJS aplicada por eslint-plugin-boundaries"
    
  consequences:
    positive: ["Aislamiento de dominio", "Testabilidad", "Intercambiabilidad de infraestructura"]
    negative: ["Mayor configuración inicial", "Curva de aprendizaje para Ports/Adapters"]
    
  constraints:
    hard_blocks:
      - "Sin importaciones de infraestructura en la capa de dominio"
      - "Sin decoradores de framework en entidades de dominio"
    warnings:
      - "Evitar sobre-abstraer adaptadores en Fase 1"

# Disparadores de recuperación (patrones en lenguaje natural que deben recuperar este ADR)
retrieval_triggers:
  - "cómo estructuro un proyecto NestJS"
  - "arquitectura hexagonal"
  - "ports and adapters"
  - "puedo importar TypeORM en mi dominio"
  - "eslint boundaries"
  - "clean architecture"
```

---

## 3. Esquema de Patrón Canónico

```yaml
pattern_id: "CP-04"
title: "Repositorio RLS Multi-Tenant"
runtime: ["dotnet", "csharp"]
adr_references: ["0010", "0044", "0031"]
phase: ["1", "2"]
complexity: "medium"

description: "Implementación de repositorio con aislamiento automático de tenant via RLS"

structure:
  port: "IUserRepository"
  adapter: "SqlUserRepository"  
  infrastructure_deps: ["EFCore", "SqlServer"]
  domain_deps: []               # DEBE estar vacío — el dominio no sabe nada

code_template: |
  public class SqlUserRepository : IUserRepository {
    // ... plantilla aquí
  }

ai_instruction: |
  Cuando un desarrollador pide crear un repositorio para una entidad multi-tenant:
  1. Generar la interfaz Port en la capa de dominio (sin imports de EF Core)
  2. Generar el Adapter en la capa de infraestructura con EF Core
  3. Incluir inyección de TenantContext via SESSION_CONTEXT
  4. Citar ADR-0010 y ADR-0044
  5. Recordar sobre la activación opcional de RLS nativo (INFRA_NATIVE vs APP_AGNOSTIC)
```

---

## 4. Formato de Reglas de Estándar de Ingeniería

Las reglas del Manifiesto de Ingeniería se almacenan como ítems de aplicación estructurados:

```yaml
rule_id: "ENG-001"
source: "Manifiesto de Ingeniería §1"
category: "SOLID"
sub_category: "Single Responsibility"
severity: "error"             # error | warning | suggestion
enforcement: "automated"      # automated | human-review | advisory

description: "Una clase debe tener una única razón para cambiar"

detection_pattern:
  type: "heuristic"
  signals:
    - "la clase tiene >3 métodos públicos con preocupaciones no relacionadas"
    - "la clase mezcla manejo HTTP con lógica de negocio"
    - "la clase contiene tanto operaciones de base de datos como validación de dominio"

ai_response_template: |
  "Esta clase parece tener múltiples responsabilidades: [PREOCUPACIONES_DETECTADAS].
  Según el Manifiesto de Ingeniería Evolith §1 (Principio de Responsabilidad Única),
  dividir en: [SPLIT_SUGERIDO]. Ver el Manifiesto de Ingeniería para orientación."

auto_fix: false
requires_adr: false
```

---

## 5. Índice de Convenciones de Nombres

Las reglas de nombres se almacenan como tablas de búsqueda que habilitan validación en tiempo real:

```yaml
# Extracto del índice AI de convenciones de nombres
naming_rules:
  
  - artifact: "domain_entity"
    runtime: "csharp"
    rule: "PascalCase sustantivo, sin sufijo"
    examples_correct: ["User", "Organization", "AuthorizationTemplate"]
    examples_wrong: ["UserEntity", "UserDTO", "user_model"]
    adr_ref: "ADR-0056"
    
  - artifact: "repository_port"
    runtime: "csharp"
    rule: "I + PascalCase + Repository"
    examples_correct: ["IUserRepository", "IOrganizationRepository"]
    examples_wrong: ["UserRepo", "UserRepositoryInterface"]
    adr_ref: "ADR-0056"
    
  - artifact: "use_case"
    runtime: "csharp"
    rule: "Frase verbal PascalCase + UseCase o Handler"
    examples_correct: ["CreateUserUseCase", "AssignTemplateHandler"]
    examples_wrong: ["UserService", "UserManager", "createUser"]
    adr_ref: "ADR-0056"
    
  - artifact: "domain_event"
    runtime: ["nodejs", "csharp"]
    rule: "Frase sustantiva PascalCase en pasado + Event"
    examples_correct: ["UserCreatedEvent", "TemplateAssignedEvent"]
    examples_wrong: ["OnUserCreated", "UserCreate", "user_created"]
    adr_ref: "ADR-0056"
```

---

## 6. Exposición de Políticas de Gobernanza

Las políticas se almacenan como árboles de decisión para enrutamiento por agentes:

```yaml
policy_id: "GOV-001"
title: "Adopción de Nueva Tecnología"
trigger: "desarrollador o IA propone una librería/herramienta no incluida en el catálogo aprobado"

decision_tree:
  - condition: "la herramienta está en approved-tools.md"
    action: "approve_and_suggest_usage_pattern"
    
  - condition: "la herramienta es similar a una herramienta aprobada"
    action: "redirect_to_approved_alternative"
    message: "Usa [HERRAMIENTA_APROBADA] en su lugar. Ver approved-tools.md."
    
  - condition: "la herramienta no está listada y es solo dependencia de dev"
    action: "warn_and_flag_for_review"
    message: "Esta herramienta requiere documentación ADR antes de su adopción."
    
  - condition: "la herramienta no está listada y es dependencia de runtime"
    action: "block"
    message: "Las dependencias de runtime requieren aprobación ADR del Architecture Board.
              Enviar propuesta ADR a reference/core/architecture/adrs/[runtime]/
              antes de proceder."
```

---

## 7. Formato SDLC y Definition of Done

```yaml
dod_id: "DOD-FASE1"
phase: 1
name: "Fase 1 — Definition of Done para Monolito Modular"

checklist_items:
  
  - id: "DOD-P1-001"
    category: "architecture"
    description: "Puertos de Arquitectura Hexagonal definidos para todas las dependencias externas"
    mandatory: true
    ai_can_validate: true
    validation_method: "verificar interfaces IPort en la capa de dominio"
    
  - id: "DOD-P1-002"
    category: "testing"
    description: "Cobertura de unit tests ≥70% para código nuevo"
    mandatory: true
    ai_can_validate: true
    validation_method: "análisis de reporte de cobertura"
    
  - id: "DOD-P1-003"
    category: "observability"
    description: "Span OTel agregado a todos los casos de uso públicos"
    mandatory: true
    ai_can_validate: true
    validation_method: "detectar OpenTelemetry.StartActivity en métodos de caso de uso"
    
  - id: "DOD-P1-004"
    category: "naming"
    description: "Todos los identificadores siguen las convenciones de nombres ADR-0056"
    mandatory: true
    ai_can_validate: true
    validation_method: "lookup de reglas de nombres contra tipo de artefacto"
    
  - id: "DOD-P1-005"
    category: "documentation"
    description: "ADR citado para cualquier nueva decisión arquitectónica"
    mandatory: true
    ai_can_validate: false    # Requiere criterio del arquitecto
    validation_method: "revisión humana del arquitecto"
```

---

## 8. Estructura de Exportación Legible por Máquina

La base de conocimiento completa de Evolith se exporta en esta estructura para los pipelines de ingestión AI:

```
evolith-ai-knowledge/
├── index.json                    ← Catálogo maestro de todos los chunks con metadata
├── adrs/
│   ├── core/
│   │   ├── adr-0001.json         ← Esquema ADR estructurado
│   │   ├── adr-0002.json
│   │   └── ...
│   ├── nodejs/
│   └── dotnet/
├── patterns/
│   ├── cp-01.json
│   └── ...
├── standards/
│   ├── engineering-manifesto-rules.json
│   ├── naming-conventions.json
│   ├── security-rules.json
│   └── testing-standards.json
├── governance/
│   ├── policies.json
│   └── dod-checklists.json
├── glossary.json                 ← Lenguaje Ubicuo para validación
└── version.json                  ← { "evolith_version": "1.x", "snapshot_date": "..." }
```

---

## 9. Política de Frescura y Sincronización

| Disparador | Acción |
|---|---|
| Nuevo ADR mergeado a main | El pipeline CI re-ingesta el ADR → actualiza el vector store |
| Estado de ADR cambia a `superseded` | Los chunks viejos se marcan deprecated en la metadata; recuperación bloqueada |
| Manifiesto de Ingeniería actualizado | Re-ingestión completa del standards store |
| Etiqueta de versión Evolith publicada | Snapshot completo de base de conocimiento creado + version.json actualizado |
| Repo hijo adopta nueva versión Evolith | El repo hijo cambia al nuevo snapshot en la config del harness |

---

## 10. Candidato de Conocimiento Externo

El material externo es una entrada candidata, nunca una regla autoritativa de Evolith. Se almacena como síntesis original con procedencia y estado de promoción; el diseño de control canónico es [V-12 — Ingesta de Conocimiento Externo](./visuals/v12-external-knowledge-intake.es.md).

```yaml
knowledge_id: "KI-FOWLER-OUTBOX-001"
source_class: "public-article" # public-article | book | official-docs
source_locator: "autor, obra, edición o URL, sección"
rights_status: "citation-and-synthesis-only"
trust_level: "primary"
promotion_status: "candidate" # candidate | evaluated | accepted | executable | retired
topologies: ["modular-monolith", "microservices"]
owner: "winston"
```

Solo el conocimiento `accepted` puede recuperarse como guía. Solo el conocimiento `executable` puede declarar un mapeo de enforcement Evolith, que requiere un ADR aprobado más regla Native, política OPA y fixtures cuando el patrón sea aplicable de forma ejecutable.

---

*Parte de la [Estrategia del Asistente AI de Arquitectura](./ai-architecture-assistant-strategy.es.md)*
