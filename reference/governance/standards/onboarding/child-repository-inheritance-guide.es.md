# Guía de Herencia para Repositorios Hijos

> **Estado:** Aceptado | **Propietario:** Consejo de Arquitectura | **Versión:** 1.0.0
> **Navegación bilingüe:** [English version](./child-repository-inheritance-guide.md)

Este documento define la mecánica formal mediante la cual los repositorios de producto derivan de esta referencia corporativa. Establece qué se hereda, qué puede extenderse, qué puede sobreescribirse y cuáles son las obligaciones de gobernanza a lo largo del ciclo de vida de un repositorio hijo.

---

## 1. Propósito y Alcance

Este repositorio de referencia es el **upstream autoritativo** para todos los repositorios de producto de la organización. No funciona como un paquete `npm` ni como un submódulo de Git. Funciona como un **contrato arquitectónico vivo** — un corpus curado de decisiones, estándares y patrones que los equipos de producto heredan, debaten y extienden dentro de su propio contexto acotado.

Cualquier repositorio creado a partir de esta base se denomina **repositorio hijo**. La relación no es una clonación puntual; es una obligación de gobernanza continua.

---

## 2. Modelo de Herencia

### 2.1 Qué Se Hereda por Defecto

Cuando un repositorio hijo se inicializa a partir de esta base, hereda el siguiente corpus:

| Capa | Activos Heredados | Mutabilidad |
| :--- | :--- | :--- |
| **Decisiones Arquitectónicas** | Todos los ADRs en `reference/architecture/adrs/` | Solo lectura como referencia; la sobreescritura requiere ADR local |
| **Leyes Estructurales** | Blueprints, línea base agnóstica, checklist de simplicidad | Obligatorio; el hijo debe cumplir o documentar la divergencia |
| **Estándares de Ingeniería** | Manifiesto (SOLID/OWASP), guía de contract testing, playbook de observabilidad | Obligatorio |
| **Reglas de Gobernanza** | Taxonomía del repositorio, convenciones de nomenclatura, reglas del harness R-01–R-18 | Obligatorio |
| **Plantillas de Infraestructura** | Mapa Docker Compose por fase, configuración declarativa de Kong | Adoptable; el hijo puede reemplazar con equivalente cloud |
| **Stack de Observabilidad** | Configuración de OTel Collector, Grafana, Tempo, Loki | Adoptable; el hijo puede reemplazar los backends |
| **Validación del Harness** | `validate-docs.mjs` — UTF-8, enlaces relativos, sintaxis Mermaid | Obligatorio en CI |

### 2.2 Qué No Se Hereda

Los siguientes elementos están intencionalmente limitados a este repositorio y no deben trasladarse a repositorios hijos sin una adaptación deliberada:

- La implementación demo `src/apps/todo-api/`. Es un laboratorio de patrones, no una plantilla de producción.
- La documentación del dominio demo en `reference/knowledge/demo/`. El conocimiento de dominio debe ser autoria del producto.
- Glosario de negocio, mapas de stakeholders y objetivos de producto. Estos son siempre específicos del producto.

---

## 3. Las Tres Operaciones de Herencia

### 3.1 Adoptar

El repositorio hijo cita un ADR o estándar de la base sin modificación. No se crea una copia local. El propio `DECISIONS.md` del hijo o su índice de ADRs referencia el upstream por identificador y URL.

**Cuándo usarlo:** La decisión aplica tal cual al contexto del hijo sin ninguna divergencia en los trade-offs.

**Obligación:** Ninguna más allá de la cita. El hijo queda vinculado por la decisión.

### 3.2 Extender

El hijo crea un nuevo ADR local que construye sobre un ADR base sin contradecirlo. El ADR local referencia el identificador upstream en su sección `Context` y agrega restricciones específicas del dominio, elecciones tecnológicas o detalles de implementación no cubiertos por la base.

**Cuándo usarlo:** El ADR base define el patrón; el hijo necesita especificar la implementación concreta para su dominio (por ejemplo, el ADR-0015 base define el event bus inyectable; el ADR-0001 del hijo especifica la topología RabbitMQ para su dominio específico).

**Obligación:** El encabezado del ADR local debe declarar `Extends: [ADR-XXXX](upstream-url)`.

### 3.3 Sobreescribir

El hijo crea un ADR local que diverge explícitamente de un ADR base. El ADR local referencia el identificador upstream, declara el motivo por el que la decisión base no aplica y documenta la decisión alternativa con su propio análisis de trade-offs.

**Cuándo usarlo:** El contexto operativo, regulatorio o de negocio del hijo hace que la decisión base sea inaplicable o contraproducente.

**Obligación:** El encabezado del ADR local debe declarar `Overrides: [ADR-XXXX](upstream-url)` e incluir una sección `Justificación de Divergencia`. Las sobreescrituras deben ser revisadas por el Consejo de Arquitectura antes de ser mergeadas.

---

## 4. Estructura del Repositorio Hijo

Un repositorio hijo debe cumplir con la taxonomía de directorios definida en la [Taxonomía del Repositorio](../repository-taxonomy.md). La estructura mínima requerida al momento de la inicialización es:

```text
/ (Raíz del Repositorio Hijo)
  README.md                    # Portal ejecutivo con enlace de vuelta al upstream base
  MASTER_INDEX.md              # Navegación por rol para este producto
  DECISIONS.md                 # Índice de ADRs adoptados, extendidos y sobreescritos
  .harness/                    # Copia de las reglas del harness base; extender según necesidad
  reference/
    architecture/
      adrs/                    # Solo ADRs locales — entradas adoptar/extender/sobreescribir
    governance/
      standards/               # Solo sobreescrituras locales a los estándares
    knowledge/
      domain/                  # Documentación de dominio específica del producto
  src/                         # Código fuente del producto
```

El archivo `DECISIONS.md` es obligatorio. Es el único lugar donde cualquier lector puede entender la postura completa de decisiones del repositorio hijo en relación con la base upstream.

---

## 5. Formato de DECISIONS.md

Cada entrada en `DECISIONS.md` debe seguir esta estructura:

```markdown
| ID | Título | Operación | Ref Upstream | ADR Local | Notas |
|---|---|---|---|---|---|
| C-001 | Usar PostgreSQL | Adoptar | ADR-0001 | — | Sin divergencia |
| C-002 | Topología del Event Bus | Extender | ADR-0015 | adrs/0001-topologia-event-bus.md | Fanout RabbitMQ para dominio de pagos |
| C-003 | Reemplazar Kong con AWS ALB | Sobreescribir | ADR-0030 | adrs/0002-alb-en-lugar-de-kong.md | Gateway gestionado por cloud mandatorio del equipo de infra |
```

---

## 6. Sincronización con el Upstream

Los repositorios hijos no están obligados a rastrear commits del upstream automáticamente. Sin embargo, aplican las siguientes obligaciones:

| Evento | Obligación |
| :--- | :--- |
| Se publica un nuevo ADR en la base (Core o runtime correspondiente) | El equipo hijo debe clasificarlo en el siguiente ciclo de planificación: adoptar, extender, sobreescribir o documentar como no-aplicable |
| Un ADR base es deprecado o reemplazado | El equipo hijo debe revisar los ADRs locales que lo extienden o sobreescriben |
| Se introduce un cambio disruptivo en el harness o los estándares de gobernanza | El equipo hijo debe actualizar su copia del harness y re-ejecutar `validate-docs.mjs` antes del próximo release |

Los cambios upstream se comunican a través del changelog y el registro de ADRs del repositorio base. Los equipos hijos son responsables de monitorear el índice de ADRs upstream.

---

## 7. Camino de Promoción

Cuando un repositorio hijo crea un ADR local que resuelve un problema de aplicabilidad universal — no específico de su dominio de negocio — el Consejo de Arquitectura puede aceptarlo como pull request al upstream base. Este es el **camino de promoción**.

Criterios para la promoción:

- La decisión es agnóstica al runtime o está claramente acotada a un único perfil de runtime.
- La decisión no introduce una dependencia en una herramienta propietaria o específica del dominio.
- El ADR sigue el formato estándar y pasa la suite de validación del harness.
- El equipo proponente está dispuesto a mantener la decisión en el contexto upstream.

Los ADRs promovidos son renumerados en la secuencia upstream y la copia local del hijo se actualiza al estado `Adoptado` apuntando al nuevo identificador upstream.

---

## 8. Resumen de Obligaciones de Gobernanza

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

---

[Volver al Índice de Onboarding](./README.md)
