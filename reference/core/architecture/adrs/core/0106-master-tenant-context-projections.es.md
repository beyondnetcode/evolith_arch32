> **Navegación Bilingüe:** [See English Version](./0106-master-tenant-context-projections.md)

# ADR-0106: Tenant Maestro y Proyecciones por Contexto

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado
Superseded by [ADR-0129](./0129-ums-is-the-tenant-master.es.md) — 2026-08-22.
MMS, nombrado más abajo como único propietario del Tenant maestro, nunca se construyó. UMS posee el
tenant y lo publica; ver la decisión que lo supersede. El texto de abajo se conserva tal cual se
escribió, sin enmendar.

## Fecha
2026-07-08

## Contexto y Problema
En la suite de productos Evolith, múltiples ofertas SaaS y sistemas (como UMS y Evolith Tracker) deben operar dentro de los límites de un inquilino (tenant). Registrar y crear tenants directamente en aplicaciones SaaS individuales conduce a un ciclo de vida de tenant fragmentado e inconexo, introduciendo retrasos en la sincronización, duplicación de datos y fricción operativa.

Al mismo tiempo, debemos mantener el límite arquitectónico central definido en [ADR-0101](../core/0101-core-stateless-evaluation-engine.es.md): **Evolith Core** debe seguir siendo un motor de evaluación estrictamente stateless que no posea ni persista registros operativos de tenants.

Sin embargo, para lograr una alta usabilidad y una operación de baja latencia en el plano de la aplicación, los servicios downstream como **Evolith Tracker** necesitan una forma rápida y local de validar el estado activo del tenant y mapear los permisos del usuario durante las acciones (por ejemplo, aprobación de gates, revisión de evidencias) sin realizar llamadas a sistemas remotos en la ruta crítica ni introducir estado de base de datos en el Core.

## Objetivo y Alcance
El objetivo es establecer las reglas de límites de registro, proyección y autorización de tenants específicamente para la **Suite de Productos Evolith** (MMS, UMS y Evolith Tracker) con el fin de optimizar la usabilidad y la latencia operativa, preservando la naturaleza stateless de Evolith Core.

**En alcance:**
- Definir **MMS** (Master Data Management) como el único propietario del registro maestro y del ciclo de vida del Tenant.
- Establecer las **Proyecciones de Tenant** (Tenant Projections) como límites locales de dominio en UMS y Evolith Tracker.
- Enfatizar que **Evolith Core** se mantiene stateless (según ADR-0101) y trata el ID del tenant únicamente como una cadena de contexto opaca.
- Optimizar la usabilidad de **Evolith Tracker** resolviendo proyecciones locales y grafos de permisos delegados por UMS bajo un presupuesto de latencia <5ms.

**Fuera de alcance:**
- El protocolo de transporte técnico específico para la sincronización de proyecciones (por ejemplo, buses de eventos, webhooks), el cual se delega a la implementación en tiempo de ejecución.

## Opciones Consideradas

### Opción 1: Registro de Tenant directo y descentralizado en cada SaaS
Cada aplicación SaaS (UMS, Tracker, etc.) expone sus propios endpoints de creación de Tenant y mantiene su propia tabla de Tenant.
- **Pros:** Autonomía de dominio.
- **Cons:** Alto riesgo de inconsistencia de datos; transacciones distribuidas complejas; viola la única fuente de verdad para los tenants corporativos.

### Opción 2: Tenant Maestro Centralizado en MMS con Proyecciones de Contexto Específicas de Dominio (Seleccionada)
El Tenant se registra primero en MMS como Dato Maestro corporativo. MMS publica o sincroniza una **Proyección de Tenant** (Tenant Projection) ligera que contiene la clave global del Tenant hacia UMS y Evolith Tracker. UMS y Tracker consumen estas proyecciones para construir límites locales.
- **Pros:** Consistencia absoluta de datos; clara separación de conceptos (SoC); esquemas de dominio desacoplados; alta usabilidad y comprobaciones locales de sub-milisegundos en Tracker; el Core se mantiene estrictamente stateless.
- **Cons:** Introduce una dependencia de la latencia de propagación de la proyección.

## Decisión y Justificación
Adoptamos la **Opción 2: Tenant Maestro Centralizado en MMS con Proyecciones de Contexto Específicas de Dominio**.

### 1. Ciclo de Vida del Tenant en la Suite de Productos
1. **Registro del Tenant:** El Tenant se registra primero en **MMS** como una entidad maestra, recibiendo una clave global única para el Tenant y metadatos corporativos.
2. **Proyección en UMS:** MMS publica/sincroniza una `TenantProjection` hacia **UMS**.
3. **Proyección en Tracker:** MMS publica/sincroniza una `TenantProjection` hacia **Evolith Tracker**.
4. **Límite de Dominio de UMS:** En UMS, el tenant proyectado sirve como límite de autorización (los usuarios, roles, perfiles y permisos se asignan dentro de este tenant).
5. **Límite de Dominio de Tracker:** En Tracker, el tenant proyectado sirve como límite local de gobernanza (los procesos SDLC, gates, evidencias, excepciones e historiales de auditoría se asocian a este tenant).

### 2. Flujo de Usabilidad y Autorización en Tracker
Para lograr una usabilidad óptima y tiempos de validación de sub-milisegundos dentro de **Evolith Tracker**:
1. Un usuario inicia sesión en **Evolith Tracker**.
2. Tracker delega la autenticación y la autorización en **UMS**.
3. UMS autentica al usuario y devuelve un **grafo de autorizaciones** que indica las membresías del usuario, el alcance activo del tenant y los permisos sobre Tracker.
4. Tracker valida que el Tenant objetivo exista como una `TenantProjection` local activa y utiliza los permisos recibidos para habilitar o bloquear acciones operativas (por ejemplo, aprobar gates, revisar evidencias) de forma instantánea.
5. Esta validación local garantiza que Tracker no realice peticiones a APIs externas durante las acciones críticas del usuario, manteniendo la latencia operativa total por debajo de **5ms**.

### 3. Regla Central de la Gobernanza del Tenant
> **MMS gobierna la identidad maestra del Tenant; UMS gobierna la identidad y autorización de usuarios dentro del Tenant; Evolith Tracker gobierna la operación SDLC del Tenant.**

Cada SaaS conserva sus propios modelos de datos internos pero referencia al mismo tenant maestro utilizando la clave global del Tenant. **Evolith Core** se mantiene estrictamente stateless, tratando `tenantId` únicamente como un identificador de contexto opaco.

## Evidencias y Criterios de Evaluación
- **Desacoplamiento de Dominios:** El desacoplamiento ha sido validado; UMS y Tracker persisten únicamente modelos de contexto locales manteniendo limpia la lógica de dominio.
- **Alineación de Diseño:** El modelo de proyecciones ya está documentado en el diseño objetivo de [Evolith Governed Composition](../../../../../product/suite/architecture/evolith-governed-composition-target-design.es.md) y en [SDLC Tracker Technical Interfaces](../../../../../product/products/evolith-tracker/sdlc-tracker-technical-interfaces.es.md).

## Consecuencias, Riesgos y Compromisos

### Positivas
- **Usabilidad y Velocidad:** Tracker realiza comprobaciones locales en sub-milisegundos, lo que incrementa drásticamente la usabilidad en comparación con llamadas remotas.
- **Única Fuente de Verdad:** MMS es la autoridad única para el estado del tenant corporativo, evitando conflictos.
- **Escalamiento Autónomo:** Si la base de datos de Tracker o UMS falla, la otra puede continuar operando sobre las proyecciones locales en caché.

### Negativas / Riesgos
- **Latencia de Proyección:** Un tenant recién creado en MMS podría experimentar pequeños retrasos antes de estar activo en las aplicaciones downstream. *Mitigación:* Asegurar que la sincronización de proyecciones utilice mensajería confiable (por ejemplo, el patrón Transactional Outbox según [ADR-0033](../core/0033-transactional-outbox-pattern.es.md)).

## Referencias
- [Glosario del Ecosistema Evolith (Canónico)](../../../sdlc/glossary/glossary-ecosystem.es.md)
- [Diseño Objetivo de Evolith Governed Composition](../../../../../product/suite/architecture/evolith-governed-composition-target-design.es.md)
- [SDLC Tracker Technical Interfaces](../../../../../product/products/evolith-tracker/sdlc-tracker-technical-interfaces.es.md)

## Decisiones y Estándares Relacionados
- [ADR-0010: Estrategia de Arquitectura Multi-Tenancy para la Evolución SaaS](../core/0010-multi-tenancy-architecture-strategy.es.md)
- [ADR-0022: Contextual Authentication and Pluggable Output Projections](../nodejs/0022-contextual-auth-and-pluggable-projections.es.md)
- [ADR-0023: Centralized Authorization Core Strategy](../nodejs/0023-centralized-ums-vs-decentralized-access.es.md)
- [ADR-0101: Evolith Core as a Stateless Evaluation Engine](../core/0101-core-stateless-evaluation-engine.es.md)

---

[Volver al Registro ADR](../README.es.md) · [Matriz ADR](../adr-matrix.es.md)
