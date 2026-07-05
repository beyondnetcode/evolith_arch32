# Local Harness Rules Reference


---

## Rule Enforcement Layers
| Capa | Mecanismo | Reglas cubiertas |
| :--- | :--- | :--- |
| **Automatizado (CI)** | Script `validar-docs.mjs` | R-03 (UTF-8), enlaces relativos, sintaxis de Mermaid |
| **Autocomprobación del agente** | Los agentes aplican reglas antes de la salida | Todos los R-01 a R-18 |
| **Revisión humana** | Revisión de relaciones públicas contra la tabla de reglas | Todos los R-01 a R-18 |

---
## Rules Table
| identificación | Nombre de la regla | Restricción |
| :--- | :--- | :--- |
| R-01 | Sincronización bilingüe | Los documentos/diagramas en español e inglés deben estar 100% sincronizados |
| R-02 | Autoridad de contexto | Consulte siempre la fuente de contexto autorizada antes de realizar tareas técnicas |
| R-03 | UTF-8 limpio | Los documentos resultantes deben ser UTF-8 puro; sin artefactos de codificación |
| R-04 | Idioma de la etiqueta | Las etiquetas de los diagramas deben coincidir estrictamente con el idioma del documento |
| R-05 | Validación de la pila tecnológica | Validar todas las menciones técnicas únicamente con la pila tecnológica aprobada |
| R-06 | Separación de historias | Separe FUNCIONAL, TÉCNICO y HABILITADOR; nunca mezclar |
| R-07 | Trazabilidad | Cuando un caso de uso cambia, actualice todos los diagramas y registre el cambio |
| R-08 | Integridad de la ruta de autenticación | Los diseños de autenticación deben mostrar explícitamente tanto los flujos internos como los de desplazados internos |
| R-09 | Legibilidad | Los documentos funcionales utilizan un lenguaje sencillo; sin jerga técnica |
| R-10 | Formato de salida de auditoría | Resultados de las auditorías: documento, ubicación, tipo de problema, gravedad, solución |
| R-11 | Orden de ejecución | Tareas duales: PO (funcional) primero, luego Arquitecto (técnico) |
| R-12 | Convenciones de nomenclatura | Aplicar prefijos de nombres y taxonomías antes de fusiones |
| R-13 | Estructura funcional | Narrativa empresarial legible; detalle técnico en sección dedicada |
| R-14 | Autoridad de tiempo de ejecución | Las referencias técnicas deben citar el perfil de tiempo de ejecución autorizado |
| R-15 | Capas multiinquilino | El aislamiento de la capa de aplicaciones es primario; La aplicación de la base de datos nativa es secundaria |
| R-16 | Contrato de catálogo | Las entidades paramétricas deben definir código, valor, descripción |
| R-17 | Extracción Modular | La lógica compartida debe preservar la preparación para la extracción |
| R-18 | Gobernanza de API híbrida | Reglas de convivencia REST y GraphQL |

---
## Detailed Rule Reference

---

### R-01 — Bilingual Sync
**Restricción:** Los documentos y diagramas en español e inglés deben estar 100% sincronizados.

**Intención:** Evita la fragmentación del conocimiento en equipos bilingües donde la versión de un idioma se vuelve obsoleta y los equipos operan desde diferentes versiones de la verdad.

**Problema evitado:** "La versión ES dice que el ADR está aceptado, pero la versión EN todavía lo muestra como Propuesto": inconsistencia invisible que erosiona la confianza en la documentación.

**Condición de activación:** Cada vez que se crea o modifica un documento en un idioma, la contraparte en el otro idioma debe actualizarse en la misma confirmación o PR.

**Ejemplo de cumplimiento:**```
CORRECT: Modifying reference-blueprint.md → also modify reference-blueprint.es.md
         in the same PR with equivalent content changes.

VIOLATION: Merging an EN ADR update without updating the ES counterpart.
```**Notas de adaptación:** Si su equipo es monolingüe, el alcance de R-01 puede ser "las variantes de la documentación deben permanecer sincronizadas" (por ejemplo, resumen frente a versión completa, interna frente a externa). El principio subyacente (ninguna variante se vuelve obsoleta) sigue siendo válido.

---
### R-02 — Context Authority
**Restricción:** Consulte siempre la fuente de contexto autorizada antes de realizar tareas técnicas.

**Intención:** Evita que los agentes operen con suposiciones obsoletas sobre el estado de la base del código, la pila o la arquitectura. La fuente autorizada se define por repositorio (en este repositorio: el registro ADR + perfiles de pila de tecnología autorizada).

**Problema evitado:** Un agente recomienda agregar una nueva biblioteca que entra en conflicto con una decisión de ADR existente, porque no verificó la pila aprobada antes de sugerir.

**Condición de activación:** Antes de que cualquier agente produzca una recomendación técnica, debe verificar que la recomendación sea consistente con las fuentes autorizadas actuales.

**Ejemplo de cumplimiento:**```
CORRECT: @architect checks ADR-0030 (Kong gateway decision) before recommending
         an API routing change.

VIOLATION: @architect recommends AWS API Gateway without checking whether
           ADR-0030 exists and is still active.
```**Notas de adaptación:** Defina qué significa "contexto autorizado" en su repositorio. Podría ser: registro ADR, `DECISIONS.md`, documento de pila tecnológica aprobado o una combinación.

---
### R-03 — UTF-8 Clean
**Restricción:** Las salidas de los documentos deben ser UTF-8 puro sin artefactos de codificación.

**Intención:** Previene problemas de codificación de caracteres que interrumpen los scripts de validación del arnés, la representación en portales de documentación y el procesamiento de contenido bilingüe.

**Problema evitado:** Documentos con caracteres Windows-1252, marcadores de lista de materiales o símbolos de rango de emoji (U+2600–U+27BF) que no superan la validación de CI o se representan incorrectamente en algunos entornos.

**Condición de activación:** Todos los documentos nuevos y cualquier documento modificado por un agente de IA.

**Cumplimiento automatizado:** `validate-docs.mjs` escanea todos los archivos Markdown y falla al detectar violaciones de codificación.

**Ejemplo de cumplimiento:**```
VIOLATION: Using checkmark (U+2713) or cross-mark (U+274C) symbols in code examples.
CORRECT:   Using text equivalents: // CORRECT, // WRONG, OK:, ERROR:
```**Notas de adaptación:** Si su equipo utiliza una herramienta de validación de documentación diferente, asigne esta regla a cualquier verificación de codificación que realice su CI. La restricción clave es: los agentes de IA no deben introducir caracteres que no sean UTF-8 que rompan las herramientas posteriores.

---
### R-04 — Label Language
**Restricción:** Las etiquetas de los diagramas deben coincidir estrictamente con el idioma del documento que las contiene.

**Intención:** Evita diagramas en idiomas mixtos que no sean completamente accesibles para los lectores en español ni para los lectores en inglés.

**Problema evitado:** Un documento en español que contiene un diagrama de sirena con etiquetas de nodo en inglés; los lectores deben cambiar de contexto a mitad del documento.

**Condición de activación:** Cualquier diagrama creado o modificado en un documento de un idioma específico.

**Exención:** Los identificadores de códigos técnicos utilizados como etiquetas de diagramas (nombres de interfaces, nombres de eventos, nombres de clases, ID de ADR) permanecen en inglés en todos los documentos. Ejemplo: `IEventBusPort`, `UserRegisteredEvent`, `ADR-0015`. Estos son identificadores de código, no lenguaje natural; traducirlos rompería la trazabilidad.

**Ejemplo de cumplimiento:**```
Spanish document — CORRECT:
  graph LR
    A[Servicio de Autenticación] --> B[Base de Datos]

Spanish document — VIOLATION:
  graph LR
    A[Authentication Service] --> B[Database]

Spanish document — EXEMPT (code identifier):
  graph LR
    A[IEventBusPort] --> B[RabbitMQAdapter]
```

---

### R-05 — Tech Stack Validation
**Restricción:** Todas las menciones técnicas deben validarse con la pila tecnológica aprobada antes de su inclusión.

**Intención:** Evita que la documentación y las propuestas de diseño se desvíen de las opciones tecnológicas aprobadas por la organización, creando arquitecturas fantasmas que nadie implementará realmente.

**Problema evitado:** Un borrador de ADR recomienda Kafka cuando el bus de eventos aprobado para la fase actual es RabbitMQ (con Kafka reservado para la Fase 3+).

**Condición de activación:** Cualquier documento que nombre una tecnología, biblioteca o marco específico.

**Ejemplo de cumplimiento:**```
CORRECT: @architect references RabbitMQ for Phase 2 event bus, consistent with ADR-0015.
VIOLATION: @architect recommends Kafka for a Phase 1 implementation without an
           overriding ADR.
```

---

### R-06 — Story Separation
**Restricción:** Las historias funcionales, técnicas y facilitadoras deben mantenerse separadas. Nunca mezcle la narrativa empresarial con los detalles de implementación.

**Intención:** Preserva la legibilidad para las partes interesadas no técnicas (PO, BA, empresas) y al mismo tiempo garantiza que la profundidad técnica esté completamente documentada, sin que un grupo tenga que leer el contenido del otro.

**Problema evitado:** Una historia de usuario que dice "Como usuario quiero iniciar sesión para que... usando JWT RS256 con caducidad de 15 minutos almacenado en cookies HttpOnly a través del esquema de autenticación en PostgreSQL": incomprensible para las empresas, insuficiente para la ingeniería.

**Condición de activación:** Cualquier historia de usuario, especificación funcional o creación o revisión de una sección PRD.

**Estructura:**```markdown```
### R-07 — Traceability
**Restricción:** Cuando un caso de uso cambia, actualice todos los diagramas relevantes y registre el cambio con: Documento, Tipo, Descripción del cambio, ID del caso de uso.

**Intención:** Evita la deriva del diagrama: el estado en el que el código, la documentación y los diagramas divergen y nadie sabe cuál es el actual.

**Condición de activación:** Cualquier modificación de un caso de uso, historia de usuario o requisito funcional.

**Ejemplo de cumplimiento:**```
Change log entry:
| Document | Type | Change | UC ID |
|---|---|---|---|
| reference-blueprint.md | C4 Container | Added RabbitMQ to Phase 2 diagram | UC-AUTH-003 |
```

---

### R-08 — Auth Path Completeness
**Restricción:** Los diseños de autenticación deben mostrar explícitamente flujos IDP (proveedor de identidad externo) e internos (basados ​​en credenciales).

**Intención:** Evita diseños de seguridad incompletos que solo representan una ruta de autenticación, dejando la otra sin documentar y potencialmente desprotegida.

**Condición de activación:** Cualquier documento o diagrama que describa los flujos de autenticación o autorización.

**Ejemplo de cumplimiento:**```
CORRECT: Auth diagram shows:
  - External IDP flow: OAuth2/OIDC → token exchange → JWT issuance
  - Internal flow: email+password → bcrypt comparison → JWT issuance
  Both paths have explicit security annotations.

VIOLATION: Auth diagram only shows the OAuth2 path, leaving internal
           credential flow undocumented.
```

---

### R-09 — Readability
**Restricción:** Los documentos funcionales utilizan un lenguaje sencillo. Sin jerga técnica en las secciones orientadas a empresas.

**Intención:** Los documentos que las partes interesadas del negocio no pueden leer no son documentos funcionales: son documentos técnicos mal etiquetados. R-09 impone la separación que define R-06.

**Condición desencadenante:** Cualquier historia funcional, resumen del producto, PRD o revisión de documentos de requisitos.

**Prueba:** Un propietario de producto sin experiencia en ingeniería debería poder leer la narrativa empresarial y los criterios de aceptación y comprender qué hace la función, a quién sirve y cómo se ve el éxito.

---
### R-10 — Audit Output Format
**Restricción:** Los resultados de la auditoría deben seguir el formato estructurado: Documento | Ubicación | Tipo de problema | Gravedad | Solución recomendada.

**Intención:** Los resultados consistentes de la auditoría permiten un seguimiento sistemático de las soluciones y evita comentarios vagos sobre los cuales no se puede actuar.

**Condición de activación:** Cualquier agente que realice una auditoría de documentación o código.

**Formato:**```
| Document | Location | Issue Type | Severity | Recommended Fix |
|---|---|---|---|---|
| reference-blueprint.md | Section 5, Risk Table | Formatting — broken table | Medium | Collapse extra pipe into Description column |
```**Niveles de gravedad:** Crítico, Alto, Medio, Bajo, Información

---
### R-11 — Execution Order
**Restricción:** Para tareas de doble perspectiva (funcional + técnica), ejecute primero la revisión de la orden de compra y luego la revisión del arquitecto. No hay ejecución paralela de revisiones dependientes.

**Intención:** La revisión técnica del arquitecto solo es significativa después de que se confirme que los requisitos funcionales son correctos. La ejecución paralela produce resultados contradictorios que deben conciliarse.

**Condición de activación:** Cualquier tarea que requiera tanto validación funcional como revisión del diseño técnico.

**Ejemplo de cumplimiento:**```
CORRECT:
  1. @po reviews story → approves business narrative and acceptance criteria
  2. @architect reviews story → validates technical requirements section

VIOLATION:
  @po and @architect review simultaneously → @architect may design against
  requirements that @po subsequently changes.
```

---

### R-12 — Naming Conventions
**Restricción:** Los prefijos de nombres y las taxonomías deben aplicarse estrictamente antes de las fusiones.

**Intención:** La denominación coherente es la base de la navegabilidad del repositorio y de las herramientas automatizadas. La deriva en las convenciones de nomenclatura rompe los patrones globales, los scripts de CI y los enlaces de referencia cruzada.

**Condición de activación:** Cualquier archivo, directorio, ADR o creación de módulo de código nuevo.

**Convenciones clave en este repositorio:**
- Directorios y archivos base: `kebab-case`
- ADR: `[4-digit-ID]-[descriptive-title].md` (por ejemplo, `0015-event-driven-architecture.md`)
- Contrapartes de ES: mismo nombre con el sufijo `.es.md` o el sufijo de directorio `-es`
- Bibliotecas de aplicaciones: prefijo `app-*` para implementables, `lib-*` para bibliotecas compartidas

---
### R-13 — Functional Structure
**Restricción:** Las historias funcionales y los artefactos equivalentes deben mantener la narrativa empresarial legible y aislar los detalles técnicos en una sección dedicada a Requisitos técnicos.

**Intención:** Operacionalizar R-06 y R-09 en un requisito estructural concreto. No basta con separar conceptualmente las preocupaciones: la estructura del documento debe imponer físicamente la separación.

**Condición de activación:** Creación o revisión de cualquier historia de usuario, especificación funcional o artefacto de requisitos.

---
### R-14 — Runtime Authority
**Restricción:** Las referencias técnicas deben citar el perfil de tiempo de ejecución autorizado y mantenerse alineadas con la pila de destino real.

**Intención:** Previene la contaminación entre tiempos de ejecución: un documento de Node.js que hace referencia a patrones .NET o un documento que especifica Entity Framework en un contexto de TypeScript.

**Condición de activación:** Cualquier documento técnico que especifique detalles de implementación, opciones de tecnología o patrones de código.

**Ejemplo de cumplimiento:**```
CORRECT: Node.js ADR references authoritative-tech-stack-nodejs.md and uses
         TypeORM, NestJS, and Jest — all in the approved Node.js profile.

VIOLATION: Node.js ADR recommends Dapper (a .NET library) for data access.
```

---

### R-15 — Multi-Tenancy Layers
**Restricción:** Los estándares multiinquilino deben definir el aislamiento de la capa de aplicación como principal y la aplicación nativa de la base de datos como seguridad secundaria. El orden nunca debe invertirse.

**Intención:** El filtrado de la capa de aplicación detecta los errores de contexto del inquilino antes de que lleguen a la base de datos. El RLS nativo de la base de datos es una segunda línea de defensa; nunca debe ser la única línea de defensa.

**Condición de activación:** Cualquier documento o diseño que aborde patrones de arrendamiento múltiple, aislamiento de inquilinos o acceso a datos.

**Ejemplo de cumplimiento:**```
CORRECT: "Tenant context is injected at the application layer via TenantContext
service. PostgreSQL RLS policies provide a secondary enforcement layer."

VIOLATION: "Tenant isolation is handled exclusively by RLS policies."
           (removes application-layer visibility and makes debugging opaque)
```

---

### R-16 — Catalog Contract
**Restricción:** Las entidades paramétricas y de configuración deben definir los campos "código", "valor" y "descripción" con expectativas de trazabilidad, unicidad, auditabilidad y extensibilidad.

**Intención:** Los catálogos de configuración sin un contrato consistente se vuelven imposibles de mantener. El mínimo de tres campos garantiza que cada entrada del catálogo sea identificable (`código`), legible por humanos (`valor`) y documentada (`descripción`).

**Condición de activación:** Diseño o revisión de cualquier catálogo paramétrico, tabla de búsqueda o entidad de configuración.

**Esquema mínimo:**```typescript
interface CatalogEntry {
  code: string;        // Unique identifier — used in code references
  value: string;       // Human-readable label
  description: string; // Purpose, constraints, valid contexts
}
```

---

### R-17 — Modular Extraction
**Restricción:** La lógica compartida y los límites de los módulos deben preservar la preparación para la extracción desde el monolito modular hasta la evolución distribuida.

**Intención:** El modelo de arquitectura progresiva requiere que cualquier módulo pueda extraerse a un servicio independiente en una fase futura sin refactorización estructural. El código que viola los límites del módulo hoy se convierte en un bloqueador de extracción mañana.

**Condición de activación:** Diseño o revisión de bibliotecas compartidas, dependencias entre módulos o interfaces de contexto limitadas.

**Ejemplo de cumplimiento:**```
CORRECT: Module A communicates with Module B exclusively through IEventBusPort.
         Extraction of Module B requires only a new adapter — no domain changes.

VIOLATION: Module A directly imports Module B's repository class.
           Extraction of Module B requires refactoring Module A's domain.
```

---

### R-18 — Hybrid API Governance
**Restricción:** Si REST y GraphQL coexisten, los comandos permanecen en REST primero y el comportamiento de las consultas debe permanecer coherente en ambas superficies.

**Intención:** Evita la confusión arquitectónica donde la semántica de mutación se divide entre REST y GraphQL sin una convención clara, lo que hace que la API sea impredecible para los consumidores.

**Condición de activación:** Cualquier documento o diseño que aborde los puntos finales de API cuando tanto REST como GraphQL están activos.

**Ejemplo de cumplimiento:**```
CORRECT:
  Commands (create, update, delete): REST endpoints exclusively
  Queries: Available via both REST and GraphQL with equivalent results

VIOLATION:
  Create task: GraphQL mutation in some contexts, POST /tasks in others
  (inconsistent command surface)
```

---

## Portable Rules Block
La siguiente es una versión condensada de las 18 reglas adecuadas para pegar directamente en un indicador del sistema `AGENTS.md`, `.cursorrules` o herramienta AI:```markdown
<!-- ## Binding Harness Rules -->

| ID | Rule | Constraint |
|---|---|---|
| R-01 | Bilingual Sync | Spanish and English docs/diagrams must stay 100% in sync |
| R-02 | Context Authority | Consult authoritative sources before technical recommendations |
| R-03 | UTF-8 Clean | Pure UTF-8 only; no encoding artifacts or emoji-range symbols |
| R-04 | Label Language | Diagram labels match document language; code identifiers exempt |
| R-05 | Tech Stack | Validate all tech mentions against approved stack before use |
| R-06 | Story Separation | FUNCTIONAL, TECHNICAL, ENABLER — never mixed |
| R-07 | Traceability | UC change → update diagrams + log: [Doc, Type, Change, UC ID] |
| R-08 | Auth Path | Auth designs show both IDP and internal flows explicitly |
| R-09 | Readability | Functional docs: plain language; no technical jargon |
| R-10 | Audit Format | Audits output: [Document, Location, Issue Type, Severity, Fix] |
| R-11 | Order | Dual tasks: PO (functional) first → Architect (technical) second |
| R-12 | Conventions | Enforce naming prefixes and taxonomies before merges |
| R-13 | Functional Structure | Business narrative readable; technical detail in dedicated section |
| R-14 | Runtime Authority | Cite authoritative runtime profile; stay aligned to target stack |
| R-15 | Multi-Tenancy | App-layer isolation primary; DB-native RLS secondary failsafe |
| R-16 | Catalog Contract | Parametric entities: code + value + description minimum |
| R-17 | Modular Extraction | Module boundaries must preserve future extraction readiness |
| R-18 | Hybrid API | REST commands-first; query behavior consistent across REST+GraphQL |
```---

[Volver a la descripción general del MÉTODO BMAD](./README.md)