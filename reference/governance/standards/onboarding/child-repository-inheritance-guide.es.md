# Guía de Herencia para Repositorios Hijos

> **Estado:** Aceptado | **Propietario:** Consejo de Arquitectura | **Versión:** 1.1.0
> **Navegación bilingüe:** [English version](./child-repository-inheritance-guide.md)

---

## Referencia Rápida

| Necesito... | Ir a |
| :--- | :--- |
| Entender el modelo mental | [Sección 1 — Modelo Mental](#1-modelo-mental) |
| Saber qué heredé el día cero | [Sección 2 — Modelo de Herencia](#2-modelo-de-herencia) |
| Decidir cómo tratar un ADR base específico | [Sección 3 — Las Cuatro Operaciones](#3-las-cuatro-operaciones-de-herencia) |
| Ver un ejemplo concreto de cabecera ADR | [Sección 4 — Formato de ADR Local](#4-formato-de-adr-local) |
| Configurar un nuevo repositorio hijo | [Sección 5 — Checklist Día Cero](#5-checklist-día-cero) |
| Entender las obligaciones continuas | [Sección 6 — Sincronización con el Upstream](#6-sincronización-con-el-upstream) |
| Contribuir una decisión de vuelta a la base | [Sección 7 — Camino de Promoción](#7-camino-de-promoción) |

---

## 1. Modelo Mental

### 1.1 Qué Es Este Repositorio

Este repositorio es el **upstream arquitectónico corporativo**. No es una plantilla que se clona una vez y se olvida. No es un paquete `npm` que se instala. Es un **contrato arquitectónico vivo** — un corpus curado y versionado de decisiones, patrones y estándares que cada equipo de producto de la organización hereda, sobre el que opera y al que contribuye de vuelta a lo largo del tiempo.

Piénsalo como la memoria arquitectónica compartida de la organización. Cada decisión registrada aquí fue tomada deliberadamente, documentada con sus trade-offs y aceptada como el punto de partida para todos los productos. Un equipo de producto que no está de acuerdo con una decisión no puede ignorarla en silencio — está obligado a documentar su divergencia formalmente, igual que cualquier otra decisión arquitectónica.

### 1.2 Qué Es un Repositorio Hijo

Un **repositorio hijo** es cualquier repositorio de producto que deriva de esta base. La relación tiene dos dimensiones:

**Estructural** — el hijo copia la taxonomía de directorios, las reglas del harness y las plantillas de gobernanza de la base en el momento de la inicialización y las mantiene como propias a partir de entonces.

**Intelectual** — el hijo hereda el corpus completo de ADRs como su conjunto de decisiones por defecto. Cada ADR base está implícitamente en vigor para el hijo a menos que el hijo documente explícitamente lo contrario.

### 1.3 Qué No Es Esto

| Malentendido Común | Realidad |
| :--- | :--- |
| "Lo cloné, así que soy independiente" | El contrato intelectual persiste después del clone. Las divergencias deben documentarse. |
| "Solo necesito leer los ADRs una vez" | Se publican nuevos ADRs base con el tiempo. Los equipos hijos los clasifican en cada ciclo de planificación. |
| "Puedo copiar solo las partes que me gustan" | La adopción selectiva sin documentar lo excluido genera deuda invisible. Usa la operación No-Aplicable en su lugar. |
| "La API demo es la plantilla para mi producto" | El `ums-api` es un laboratorio de patrones. Demuestra que los patrones funcionan. No es scaffolding de producción. |

---

## 2. Modelo de Herencia

### 2.1 Qué Se Hereda por Defecto

Cuando un repositorio hijo se inicializa desde esta base, el siguiente corpus está en vigor:

| Capa | Activos Heredados | Mutabilidad |
| :--- | :--- | :--- |
| **Decisiones Arquitectónicas** | Todos los ADRs en `reference/architecture/adrs/` | Implícitamente adoptados; sobreescribir o marcar como no-aplicable si no corresponde |
| **Leyes Estructurales** | Blueprints, línea base agnóstica, checklist de simplicidad | Obligatorio; la divergencia requiere justificación documentada |
| **Estándares de Ingeniería** | Manifiesto (SOLID/OWASP), guía de contract testing, playbook de observabilidad | Obligatorio |
| **Reglas de Gobernanza** | Taxonomía del repositorio, convenciones de nomenclatura, reglas del harness R-01–R-18 | Obligatorio |
| **Plantillas de Infraestructura** | Mapa Docker Compose por fase, configuración declarativa del API Gateway | Adoptable; el hijo puede reemplazar con equivalente cloud |
| **Stack de Observabilidad** | Configuración de colector de telemetría y backends de observabilidad (métricas, logs, trazas) | Adoptable; el hijo puede reemplazar los backends con capacidad equivalente |
| **Validación del Harness** | `validate-docs.mjs` — UTF-8, enlaces relativos, sintaxis Mermaid | Obligatorio en CI |

### 2.2 Qué No Se Hereda

Los siguientes elementos están intencionalmente limitados a este repositorio. Trasládalos a un hijo solo con adaptación deliberada:

| Activo | Razón para No Heredarse |
| :--- | :--- |
| `src/apps/ums-api/` y `src/apps/ums-web/` | Implementación satélite de referencia (UMS) — no es scaffolding de producción |
| `reference/knowledge/demo/` | El conocimiento de dominio es siempre específico del producto |
| Glosario de negocio, mapas de stakeholders, objetivos de producto | Deben ser autoria del dominio del producto real |

---

## 3. Las Cuatro Operaciones de Herencia

Cada ADR base que un hijo encuentre debe recibir una de cuatro operaciones. Esta asignación se registra en `DECISIONS.md`. El silencio no es una opción — un ADR no revisado es un riesgo invisible.

### 3.1 Adoptar

El hijo acepta el ADR base tal como está. No se crea copia local. El `DECISIONS.md` del hijo registra la cita por identificador y URL upstream.

**Señal:** La decisión aplica al contexto del hijo sin ninguna divergencia en los trade-offs.

**Obligación:** Cita en `DECISIONS.md`. El hijo queda completamente vinculado por la decisión.

---

### 3.2 Extender

El hijo crea un ADR local que construye sobre un ADR base sin contradecirlo. El ADR base establece el patrón; el ADR local agrega restricciones específicas del dominio, elecciones tecnológicas o detalles de implementación.

**Señal:** El ADR base es correcto en principio pero está subespecificado para el dominio del hijo.

**Ejemplo:** El ADR-0015 base define el patrón de event bus inyectable (in-memory → RabbitMQ → Kafka). El ADR-0001 del hijo lo extiende especificando la topología exacta de exchanges de RabbitMQ para el dominio de pagos, la estrategia de dead-letter y la nomenclatura de consumer groups.

**Obligación:** El encabezado del ADR local debe incluir `Extends: ADR-0015`.

---

### 3.3 Sobreescribir

El hijo crea un ADR local que diverge explícitamente de un ADR base. El ADR local debe declarar por qué la decisión base no aplica y documentar la alternativa con su propio análisis de trade-offs.

**Señal:** El contexto operativo, regulatorio o de negocio del hijo hace que la decisión base sea inaplicable o contraproducente.

**Ejemplo:** El ADR-0030 base selecciona Kong Gateway como proxy perimetral. El ADR-0002 del hijo lo sobreescribe porque opera en un entorno gestionado por AWS donde el equipo de infraestructura exige AWS ALB como único punto de entrada.

**Obligación:** El encabezado del ADR local debe incluir `Overrides: ADR-0030` y una sección `Justificación de Divergencia`. Las sobreescrituras requieren revisión del Consejo de Arquitectura antes del merge.

---

### 3.4 No Aplicable

El hijo registra que un ADR base no aplica a su contexto sin crear una divergencia. No se necesita ADR local — solo una entrada en `DECISIONS.md` con un breve razonamiento.

**Señal:** El ADR base aborda una preocupación completamente irrelevante para el hijo (por ejemplo, un ADR de Android en un servicio puramente backend, o un ADR de multi-tenancy en una herramienta interna de un solo tenant).

**Obligación:** Entrada en `DECISIONS.md` con operación `N/A` y una razón de una línea. Esto evita que revisores futuros asuman que el ADR fue ignorado por descuido.

---

## 4. Formato de ADR Local

Los ADRs locales en repositorios hijos siguen el mismo formato que los ADRs base, con dos campos de cabecera adicionales.

### 4.1 Ejemplo de Cabecera de Extensión

```markdown
# ADR-0001 — Topología de Exchanges RabbitMQ para el Dominio de Pagos

> **Estado:** Aceptado
> **Fecha:** 2026-05-22
> **Extends:** [ADR-0015 — Arquitectura Orientada a Eventos Intra-Dominio](https://github.com/beyondnetcode/evolith_arch32/reference/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)

## Contexto

El ADR-0015 establece el patrón de event bus inyectable y define el camino de migración
de in-memory a RabbitMQ. Este ADR especifica la topología concreta de RabbitMQ requerida
por el dominio de pagos, que no está cubierta por la decisión base.

## Decisión

Usar un topic exchange `payments.events` con patrón de routing key `payments.<entidad>.<verbo>`.
La cola dead-letter `payments.dlq` recibe todos los mensajes no reconocidos después de 3 reintentos.

## Consecuencias
...
```

### 4.2 Ejemplo de Cabecera de Sobreescritura

```markdown
# ADR-0002 — AWS ALB como Proxy Perimetral

> **Estado:** Aceptado
> **Fecha:** 2026-05-22
> **Overrides:** [ADR-0030 — API Gateway: Kong vs NestJS](https://github.com/beyondnetcode/evolith_arch32/reference/architecture/adrs/core/0030-api-gateway-kong-vs-nestjs.md)

## Justificación de Divergencia

El equipo de plataforma de infraestructura exige AWS ALB como único punto de entrada para
todos los servicios en la landing zone de AWS de la organización. Operar una instancia
self-hosted de Kong junto con ALB introduce capas de enrutamiento redundantes, terminación
TLS en conflicto y una sobrecarga operativa no soportada por el equipo de plataforma.

## Decisión

Usar AWS ALB con reglas de listener para enrutamiento basado en rutas. Las funcionalidades
específicas de Kong (rate limiting, ecosistema de plugins) se reemplazan con reglas WAF de
ALB y Lambda authorizers.

## Consecuencias
...
```

---

## 5. Checklist Día Cero

Pasos a ejecutar al crear un nuevo repositorio hijo desde esta base.

### Paso 1 — Inicializar el repositorio

```bash
git clone --depth 1 https://github.com/beyondnetcode/evolith_arch32.git mi-producto
cd mi-producto
rm -rf .git
git init
git add .
git commit -m "chore: bootstrap desde la base de referencia corporativa v1.x"
```

### Paso 2 — Eliminar los activos demo

Eliminar el contenido que no debe trasladarse sin adaptación deliberada:

```bash
# Eliminar la implementación demo (reemplazar con el src del producto)
rm -rf src/apps/ums-api

# Eliminar el conocimiento de dominio demo (reemplazar con la documentación del dominio del producto)
rm -rf reference/knowledge/demo
```

### Paso 3 — Crear los archivos obligatorios

| Archivo | Contenido |
| :--- | :--- |
| `README.md` | Reemplazar el README base con el portal ejecutivo del producto. Incluir un enlace `Upstream Base` de vuelta a este repositorio. |
| `MASTER_INDEX.md` | Reemplazar con navegación por rol para el producto. |
| `DECISIONS.md` | Crear con la estructura de tabla definida en la Sección 6. Clasificar todos los ADRs base en el primer pase. |
| `reference/knowledge/domain/` | Crear la documentación de dominio del producto: glosario de negocio, mapa de contextos acotados, mapa de stakeholders, objetivos de producto. |

### Paso 4 — Configurar el harness

```bash
# Las reglas del harness ya están incluidas desde el clone
# Verificar que pasan antes del primer commit
node .harness/scripts/validate-docs.mjs
```

Agregar la validación al pipeline de CI:

```yaml
# .github/workflows/docs-validation.yml
- name: Validate documentation
  run: node .harness/scripts/validate-docs.mjs
```

### Paso 5 — Completar la primera clasificación de DECISIONS.md

Revisar todos los ADRs del registro base. Para cada ADR, asignar una de las cuatro operaciones (Adoptar / Extender / Sobreescribir / N/A) y registrarla en `DECISIONS.md`. Esta primera clasificación es el acto de gobernanza más importante en la vida del repositorio hijo.

---

## 6. Sincronización con el Upstream

Los repositorios hijos no rastrean commits upstream automáticamente. Aplican las siguientes obligaciones:

| Evento | Obligación | Responsable |
| :--- | :--- | :--- |
| Nuevo ADR base publicado | Clasificar en el siguiente ciclo de planificación: Adoptar / Extender / Sobreescribir / N/A | Tech Lead |
| ADR base deprecado o reemplazado | Revisar todos los ADRs locales que lo extienden o sobreescriben | Tech Lead |
| Cambio disruptivo en el harness o estándares de gobernanza | Actualizar la copia del harness y re-ejecutar `validate-docs.mjs` antes del próximo release | Equipo de desarrollo |

Los cambios upstream se comunican a través del registro de ADRs y el changelog del repositorio base. Los equipos hijos son responsables de monitorear el índice de ADRs upstream en cada ciclo de planificación.

### Formato de DECISIONS.md

```markdown
# DECISIONS.md — [Nombre del Producto]

Upstream base: https://github.com/beyondnetcode/evolith_arch32
Versión base al inicializar: [hash de commit o tag]
Última clasificación: [fecha]

| ID    | Título                              | Operación    | Ref Upstream | ADR Local                              | Notas                                                   |
| :---- | :---------------------------------- | :----------- | :----------- | :------------------------------------- | :------------------------------------------------------ |
| C-001 | Usar PostgreSQL                     | Adoptar      | ADR-0001     | —                                      | Sin divergencia                                         |
| C-002 | Arquitectura Hexagonal              | Adoptar      | ADR-0002     | —                                      | Sin divergencia                                         |
| C-003 | Topología del Event Bus             | Extender     | ADR-0015     | adrs/0001-topologia-event-bus.md       | Fanout RabbitMQ para el dominio de pagos                |
| C-004 | Reemplazar Kong con AWS ALB         | Sobreescribir| ADR-0030     | adrs/0002-alb-en-lugar-de-kong.md      | Gateway gestionado por cloud mandatorio del equipo infra|
| C-005 | Perfil de stack Android             | N/A          | ADR-0040     | —                                      | Producto solo backend; sin runtime móvil                |
```

---

## 7. Camino de Promoción

Cuando un ADR local resuelve un problema de aplicabilidad universal — no específico del dominio de negocio del hijo — el Consejo de Arquitectura puede aceptarlo como pull request a la base upstream.

### Criterios de Promoción

| Criterio | Descripción |
| :--- | :--- |
| **Alcance de runtime** | Agnóstico al runtime o claramente acotado a un único perfil de runtime |
| **Neutralidad de vendor** | No introduce dependencia en una herramienta propietaria o específica del dominio |
| **Cumplimiento de formato** | Sigue el formato estándar de ADR y pasa `validate-docs.mjs` |
| **Compromiso de mantenimiento** | El equipo proponente acepta la propiedad continua de la decisión en el contexto upstream |

### Proceso de Promoción

1. Abrir un pull request contra la base upstream con el ADR en el subdirectorio `adrs/` correcto.
2. El Consejo de Arquitectura revisa contra los cuatro criterios anteriores.
3. Si es aceptado, el ADR es renumerado en la secuencia upstream.
4. La entrada en `DECISIONS.md` del hijo se actualiza de `Extender` o referencia ADR local a `Adoptar` con el nuevo identificador upstream.

---

## 8. Referencia Real — Satelite UMS

El **User Management System (UMS)** es un satelite en produccion de esta base. Demuestra las cuatro operaciones de herencia en un contexto de producto real y sirve como implementacion de referencia para equipos que arrancan nuevos repositorios hijo.

**Repositorio:** https://github.com/beyondnetcode/ums

### Instantanea de decisiones de herencia de UMS

| Operacion | ADR UMS | Ref Upstream | Resumen |
| :--- | :--- | :--- | :--- |
| Adoptar | ADR-0050 | ADR-0056 (Nomenclatura) | Convenciones de nombres adoptadas literalmente para C#, SQL, REST, CloudEvents |
| Extender | ADR-0052 | ADR-0033 (Audit Trail) | Audit trail inmutable extendido con tablas temporales SQL Server y RLS como failsafe |
| Extender | ADR-0058 | ADR-0012 (API Gateway) | Gateway YARP propuesto como evolucion multi-cliente; nginx se mantiene como servidor estatico |
| Anular | ADR-0059 | ADR-0030 (split API Gateway) | Decision de tier API unico: separacion CQRS a nivel de protocolo, no de despliegue |

### El patron Override en la practica — ADR-0059

Evolith permite separar superficies de consulta y comando en tiers de API independientes cuando la escala o la propiedad de equipos lo justifica. UMS decidio explicitamente no hacerlo en la madurez MVP.

**Por que el override es valido:**
- La separacion CQRS lectura/escritura ya existe a nivel de protocolo: GraphQL (queries) vs REST (commands).
- Separar tiers duplicaria el costo operacional sin beneficio medible a la carga actual.
- El riesgo de aislamiento de carga multi-tenant se mitiga con limites de complejidad GraphQL, timeouts por operacion y rate limiting por tenant en la capa del gateway YARP.

**El override esta acotado en el tiempo.** El ADR-0059 de UMS documenta disparadores explicitos para cuando la decision debe revisarse: requisitos de escala independiente lectura/escritura, propiedad de equipos separada o inicio de extraccion a microservicios.

> Este es el patron esperado: **heredar la linea base, anular con evidencia, documentar el disparador para revertir.**

### Como UMS documenta la relacion satelite

UMS expone el modelo de gobernanza a sus propios desarrolladores en su Portal de Arquitectura (`docs/architecture/index.es.md`), donde explica los tres modos (Adoptar / Especializar / Anular) con ejemplos concretos. Los equipos que construyen satelites deben replicar esta seccion del portal para que cada desarrollador del equipo hijo entienda el contrato de herencia desde el primer dia.

---

## 9. Resumen de Obligaciones de Gobernanza

| Obligación | Frecuencia | Responsable |
| :--- | :--- | :--- |
| Clasificar nuevos ADRs upstream | Por ciclo de planificación | Tech Lead |
| Mantener `DECISIONS.md` actualizado | Por cada cambio de ADR | Tech Lead |
| Pasar `validate-docs.mjs` en CI | Por commit | Equipo de desarrollo |
| Revisar sobreescrituras con el Consejo de Arquitectura | Antes del merge | Tech Lead + Arquitecto |
| Proponer promociones upstream para decisiones universales | Al identificarlas | Tech Lead |

---

## Documentos Relacionados

- [Taxonomía del Repositorio](../repository-taxonomy.md)
- [Guía de Inicio Rápido para Nuevos Productos](./product-quick-start.md)
- [Registro ADR](../../../architecture/adrs-es/README.md)
- [Línea Base Arquitectónica Agnóstica](../../../architecture/blueprints-es/authoritative-tech-stack-agnostic.md)
- [Manifiesto de Ingeniería](../engineering/engineering-manifesto.md)
- [Frameworks Aumentados por IA](../ai-augmented/frameworks/README.es.md)

---

[Volver al Índice de Onboarding](./README.md)
