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

## 4. Topología de Servicios — Arquitectura de Microservicios Orientada a Dominios (DOMA)

> **Aplica en Fase 3 (microservicios F3).** Los productos en F1/F2 permanecen como monolito modular; esta sección documenta cómo se descompone el modelo **cuando** se cumplen los criterios de extraction-readiness. Gobernado por [ADR-0076](../../architecture/adrs/core/0076-domain-oriented-microservice-architecture.es.md).

Indica, para cada bounded context anterior, cómo mapea a una topología de servicios bajo DOMA:

- **Agrupación por dominio:** qué bounded context(s) forman cada dominio de negocio (la unidad de autonomía). Un servicio pertenece a exactamente un dominio.
- **Contrato de gateway de dominio:** el contrato estable y versionado que cada dominio expone; las llamadas intra-dominio pueden ser directas, la interacción cross-dominio es asíncrona (eventos).
- **Propiedad de datos:** confirmar que no hay joins cross-dominio ni esquemas compartidos (schema-per-context).
- **Guardia de descomposición:** confirmar que ninguna frontera de servicio propuesta parte un bounded context.

[PLACEHOLDER: tabla por dominio — dominio · bounded contexts · contrato de gateway · esquema propio · eventos asíncronos consumidos/publicados]
