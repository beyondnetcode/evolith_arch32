# Plantilla de Modelo DDD

> **Navegación bilingüe:** [English](./ddd-model-template.md)
> **Fase Requerida:** Fase 2 — Diseño
> **Audiencia Principal:** Arquitectos, Desarrolladores, Agentes IA

## 1. Lenguaje Ubicuo (Ubiquitous Language)
[PLACEHOLDER: Definir terminología estricta compartida entre el negocio y el área técnica]

## 2. Mapas Conceptuales y Agregados (Mermaid)

### 2.0. Leyendas y Glosario Visual
| Símbolo/Estereotipo | Significado |
| :--- | :--- |
| `<<Aggregate Root>>` | Entidad raíz transaccional. Gobierna la persistencia y consistencia de las entidades internas. |
| `<<Entity>>` | Objeto de dominio con identidad única, dependiente de su Aggregate Root. |
| `<<Value Object>>` | Objeto inmutable sin identidad propia. Representa una propiedad estructural. |
| `<<Shared Kernel Shell>>` | Módulo transversal externo al dominio, inyectado por infraestructura. |
| `*--` (Línea sólida) | **Composición**. El elemento hijo no puede existir sin el padre. |
| `..>` (Línea punteada)| **Dependencia**. El elemento depende de interactúa con el otro componente para delegar acciones. |

### 2.1. Vista 1: Core de Negocio (Agregados y Entidades)
[PLACEHOLDER: Diagrama de clases Mermaid mostrando SOLO los agregados puros y entidades]

### 2.2. Vista 2: Componentes de Workflow y Auditoría
[PLACEHOLDER: Diagrama de clases Mermaid mostrando StateTransition, AuditControl y RequirementChecklist]

### 2.3. Vista 3: Infraestructura Transversal (Shells)
[PLACEHOLDER: Diagrama de clases Mermaid mostrando las dependencias hacia TenantConfigShell, WorkflowEngine y UMS]

## 3. Diseño Táctico
[PLACEHOLDER: Explicar decisiones de diseño, patrón Small Aggregates, fronteras y Context Mapping]
