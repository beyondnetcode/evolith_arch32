# ADR-0067: Modular Monolith Persistence Boundaries


---

## Status
Aceptado
## Fecha
2026-06-03

## Context and Problem Statement
Evolith inicia las implementaciones de productos como una arquitectura progresiva, comúnmente comenzando con un monolito modular antes de cualquier migración justificada a módulos distribuidos o microservicios.

Un modo de falla frecuente en los monolitos modulares es que el código fuente se separa en módulos, pero el modelo de persistencia sigue siendo un modelo compartido sin restricciones. Cuando todos los módulos comparten libremente las mismas estructuras de persistencia, los equipos pueden introducir accidentalmente acoplamientos ocultos a través del acceso directo a tablas, uniones entre dominios, propiedad de datos poco clara, dependencias implícitas y conflictos de migración que son difíciles de eliminar más adelante.

Esta decisión define la estrategia de límites de persistencia de referencia para los monolitos modulares basados ​​en Evolith, de modo que los repositorios de productos sigan siendo simples en las primeras fases y al mismo tiempo preserven una ruta de migración limpia hacia la extracción de servicios futuros.

Este ADR define intencionalmente el principio de límites arquitectónicos, no un único patrón de implementación de base de datos obligatorio.
## Decision
Evolith requiere implementaciones de monolitos modulares para definir límites de persistencia explícitos por módulo, contexto limitado o capacidad de dominio.

Cada módulo debe poseer su modelo de persistencia y no debe mutar directamente las estructuras de persistencia propiedad de otro módulo.

El mecanismo concreto de aislamiento de persistencia puede variar según el producto, el motor de base de datos, el ORM, el modelo de alojamiento, la madurez operativa y la fase de implementación.

Las estrategias de implementación válidas incluyen, entre otras:

- esquema por módulo/dominio;
- convenciones de nomenclatura de tablas con propiedad obligatoria;
- espacios de nombres de migración separados;
- usuarios, permisos o roles separados de la base de datos;
- bases de datos físicas separadas cuando esté justificado;
- modelos de lectura, proyecciones o almacenes de informes aprobados para consultas entre módulos.

Para implementaciones de referencia de Evolith, el valor predeterminado recomendado es:
```text
Single physical database + logically separated persistence areas per module/domain
```

Cuando el motor de base de datos seleccionado admite esquemas como contenedores lógicos de primera clase, la estrategia de referencia preferida es:

```text
Single physical database + schema per module/domain
```

Ejemplo de estructura de referencia:

```text
evolith_database
├── identity_boundary
├── access_boundary
├── tenant_boundary
├── audit_boundary
└── notification_boundary
```

Esta decisión no exige múltiples bases de datos físicas durante la primera fase de implementación. La separación física de la base de datos se difiere hasta que un módulo tenga una necesidad justificada de implementación, escalamiento, propiedad, aislamiento de seguridad o extracción de microservicios independientes.
## Architectural Rules
1. Cada módulo posee su modelo de persistencia y estructuras de persistencia internas.
2. Un módulo no debe mutar directamente las estructuras de persistencia propiedad de otro módulo.
3. El acceso entre módulos debe realizarse a través de contratos de aplicación explícitos, puertos, servicios de dominio, eventos de integración o modelos de lectura aprobados.
4. Se desaconsejan las uniones transfronterizas entre diferentes dominios y requieren una justificación arquitectónica cuando se utilizan.
5. Las migraciones de bases de datos deben preservar la propiedad del módulo y ser rastreables hasta el módulo propietario o el contexto limitado.
6. La separación persistente es un mecanismo de aplicación de límites, no simplemente una convención de nomenclatura.
7. Las implementaciones de productos deben documentar la estrategia de límites de persistencia elegida cuando difiere de la estrategia de referencia de Evolith.
## Rationale
Los límites de persistencia hacen visible la propiedad del dominio debajo de la capa de aplicación y reducen el riesgo de acoplamiento a nivel de base de datos.

Un enfoque de esquema por dominio es un fuerte valor predeterminado para las bases de datos relacionales que admiten esquemas porque mantiene la Fase 1 operativamente simple y al mismo tiempo hace explícita la propiedad del módulo. Sin embargo, Evolith debe seguir siendo portátil entre productos, motores de bases de datos, tecnologías de persistencia y niveles de madurez.

Este enfoque se alinea con el principio de Evolith:

> Separar conceptualmente antes de separar físicamente.

Permite el siguiente camino evolutivo:
```text
Modular Monolith with explicit persistence boundaries
        ↓
Identify a module that requires extraction
        ↓
Harden or isolate that module's persistence boundary
        ↓
Move the module's persistence model to a dedicated database when justified
        ↓
Replace in-process access with APIs, events, or integration contracts
```

## Alternatives Considered

### Alternative 1: Single physical database with one unconstrained shared persistence model
Esta es la configuración inicial más simple, pero crea un alto riesgo de acoplamiento oculto y propiedad de datos poco clara. Encarece la extracción futura de servicios porque los límites de los datos del módulo no son explícitos.

**Resultado:** Rechazado como línea base de Evolith.
### Alternative 2: Dedicated physical database per module from Phase 1
Esto maximiza el aislamiento de los datos, pero introduce una complejidad operativa, transaccional, de implementación, de respaldo, de monitoreo y de desarrollo local innecesaria para las primeras fases.

**Resultado:** Rechazado para la línea base predeterminada de la Fase 1.
### Alternative 3: Single physical database with schema per module/domain as a mandatory rule
Esto equilibra la simplicidad operativa con la disciplina de los límites arquitectónicos, pero sobreespecifica el mecanismo de implementación para un ADR central de Evolith. Algunos productos pueden utilizar motores de bases de datos, tecnologías de persistencia o restricciones de plataforma donde los esquemas no están disponibles, son indeseables o insuficientes como único mecanismo de límite.

**Resultado:** Rechazado como mandato universal; aceptada como la estrategia de referencia preferida cuando se apoya.
### Alternative 4: Explicit persistence boundaries with product-specific implementation mechanisms
Esto mantiene estable el requisito arquitectónico y al mismo tiempo permite que el mecanismo de aplicación concreto varíe según el producto y la tecnología.

**Resultado:** Aceptado.
## Consequences

### Positive
- Propiedad de datos más clara por módulo/dominio.
- Reducido riesgo de acoplamiento oculto entre módulos.
- Mejor alineación entre la modularidad del código y la modularidad de persistencia.
- Extracción futura más sencilla de módulos seleccionados en microservicios.
- Mejor portabilidad entre motores de bases de datos y tecnologías de persistencia.
- Mayor trazabilidad de ADR para las decisiones de la Fase 1 sin limitar excesivamente las implementaciones de productos.
### Negative / Trade-offs
- Requiere disciplina para evitar dependencias transfronterizas no autorizadas.
- Requiere convenciones de nomenclatura, migración y propiedad desde el principio.
- No impide el acoplamiento por sí solo si los equipos omiten los contratos a nivel de aplicación.
- Puede requerir gobernanza adicional para informes excepcionales o escenarios de modelo de lectura.
- Requiere que los equipos de productos documenten su mecanismo de límites de persistencia concreto cuando no utilizan la estrategia de referencia de Evolith.
## Compliance
Los repositorios de productos que heredan Evolith deben definir límites explícitos de propiedad de persistencia por módulo, contexto limitado o capacidad de dominio.

Un ADR específico del producto puede especializar los detalles del motor de la base de datos, los nombres de los esquemas, las convenciones de las tablas, las herramientas de migración, los permisos de la base de datos, los modelos de lectura, la estrategia de generación de informes o las restricciones específicas del contexto.

Los productos son compatibles cuando preservan la regla básica de que cada módulo/dominio posee su límite de persistencia y el acceso de persistencia entre módulos se rige mediante contratos arquitectónicos explícitos.

El uso de esquema por dominio es la estrategia de referencia recomendada por Evolith cuando el motor de base de datos seleccionado admite esquemas, pero no es el único mecanismo de implementación compatible.
## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.


> **Agent Signature:** Architect Agent
