# Content Management Abstraction — Headless CMS como Acelerador de Time to Market

> **Navegación bilingüe:** [English Version](./content-management-abstraction.md)
>
> **Clasificación Evolith:** Buena práctica opcional / condicional
>
> **Propietario:** Evolith Architecture Board
>
> **Estado:** Referencia activa
>
> **Padre:** [Centro de Estándares Corporativos](../README.es.md)

---

## Propósito

Content Management Abstraction define una capacidad opcional para separar contenido administrable del dominio transaccional del sistema. Su objetivo es mejorar productividad, autonomía de negocio y Time to Market sin contaminar el core de negocio con dependencias editoriales o herramientas concretas.

Esta práctica permite que textos, banners, FAQs, páginas, contenido institucional, contenido multi-idioma y material editable por negocio evolucionen sin requerir un ciclo completo de desarrollo, pruebas y despliegue del sistema core.

---

## Principio Rector

> No todo cambio debe convertirse en desarrollo.

Evolith recomienda separar explícitamente:

| Tipo de responsabilidad | Dueño recomendado |
|---|---|
| Contenido editable | Content Management Abstraction / Headless CMS |
| Reglas de negocio | Servicios core del dominio |
| Procesos transaccionales | Aplicación / bounded context responsable |
| Parámetros técnicos sensibles | Configuración segura / secrets / platform services |
| Estados de workflow core | Dominio transaccional |

El CMS administra contenido. El dominio core administra reglas de negocio.

---

## Alcance

Esta práctica aplica cuando una solución necesita reducir fricción operativa asociada a cambios editoriales o de contenido no transaccional.

### Casos de Uso Recomendados

| Caso | Recomendación |
|---|---|
| Textos de pantalla administrables por negocio | Usar CMA |
| Banners y campañas informativas | Usar CMA |
| FAQs y contenido de autoservicio | Usar CMA |
| Páginas institucionales o landing pages | Usar CMA |
| Contenido multi-idioma | Evaluar CMA |
| Catálogos editoriales no transaccionales | Evaluar CMA |
| Contenido legal o informativo versionable | Evaluar CMA con flujo de aprobación |

### Casos Fuera de Alcance

| Caso | Decisión Evolith |
|---|---|
| Reglas críticas de negocio | No usar CMS como fuente maestra |
| Pricing transaccional | Mantener en dominio core |
| Estados de workflow | Mantener en dominio core |
| Datos de clientes, usuarios o tenants | Mantener en servicios autorizados |
| Parámetros técnicos sensibles | Mantener en plataforma/configuración segura |
| Datos regulados o altamente sensibles | Requiere análisis formal de seguridad y cumplimiento |

---

## Implementaciones Posibles

Content Management Abstraction no prescribe una herramienta obligatoria. La capacidad puede implementarse mediante:

| Tipo de implementación | Cuándo considerarla |
|---|---|
| Headless CMS open source | Cuando se busca rapidez, self-hosting y extensibilidad |
| Headless CMS enterprise | Cuando se requiere SLA, soporte, workflows avanzados o compliance |
| CMS interno | Cuando el dominio editorial tiene reglas específicas de la organización |
| Git-based content | Cuando el contenido debe versionarse como código |
| Parameter/content service propio | Cuando el contenido se mezcla con configuración no sensible y requiere APIs controladas |

### Implementación Recomendada Inicial

La implementación recomendada por defecto para evaluación inicial es **Strapi Community Edition**, por ser una opción open source, self-hosted y extensible para modelar contenido y exponerlo por API.

Esta recomendación no convierte a Strapi en dependencia obligatoria de Evolith. Cada adopción debe validarse mediante criterios de fit arquitectónico, seguridad, soporte, operación y licenciamiento.

---

## Modelo de Referencia

```text
Usuarios de Negocio / Producto / Marketing
        |
        v
Content Management Abstraction
        |
        +--> Headless CMS API
        +--> Git-based content
        +--> Internal content service
        |
        v
Frontend / Portal / Mobile / BFF
        |
        v
Core Business APIs
```

El frontend o BFF puede consumir contenido desde la capacidad CMA, mientras que las operaciones transaccionales continúan siendo atendidas por los servicios core del sistema.

---

## Criterios de Decisión

Debe evaluarse Content Management Abstraction cuando se cumpla una o más de estas condiciones:

- El contenido cambia con frecuencia.
- Negocio necesita publicar o modificar contenido sin esperar releases técnicos.
- El equipo de ingeniería está invirtiendo esfuerzo recurrente en cambios editoriales simples.
- Se requiere multi-idioma o variantes de contenido por canal.
- El portal necesita FAQs, páginas informativas, banners o textos legales administrables.
- Se busca reducir lead time de cambios no transaccionales.

No debe adoptarse si el problema real es una regla de negocio, un proceso transaccional, un parámetro sensible o una necesidad de datos maestros.

---

## Reglas de Gobierno

La adopción de CMA es opcional, pero se vuelve **condicionalmente gobernada por ADR** cuando impacta cualquiera de los siguientes aspectos:

- Selección tecnológica.
- Seguridad, autenticación o autorización.
- Modelo multi-tenant.
- Contratos API públicos o internos.
- Persistencia o almacenamiento de assets.
- Topología de despliegue.
- Observabilidad y operación.
- Integración transversal con otros sistemas.

Cuando aplique, el ADR debe declarar:

1. Por qué se requiere una capacidad CMA.
2. Qué contenido queda dentro y fuera del CMS.
3. Qué herramienta se selecciona y por qué.
4. Cómo se protegen permisos, ambientes y datos.
5. Cómo se versionan content types, migraciones y assets.
6. Cómo se prueba la integración.
7. Cómo se opera, monitorea y respalda la solución.

---

## Impacto Esperado en Productividad

| Dimensión | Impacto esperado |
|---|---|
| Time to Market | Reduce cambios editoriales de ciclos de release a ciclos de publicación de contenido |
| Autonomía de negocio | Permite que usuarios autorizados administren contenido sin depender de ingeniería |
| Foco de ingeniería | Libera capacidad técnica para funcionalidades core |
| Riesgo operativo | Reduce redeploys por cambios menores |
| Consistencia | Centraliza contenido reutilizable entre canales |
| Escalabilidad organizacional | Permite separar gobierno editorial de gobierno transaccional |

---

## Quality Gates Recomendados

Antes de promover una integración CMA a producción, deben validarse como mínimo:

- Autenticación y autorización del panel administrativo.
- Separación de ambientes: desarrollo, staging y producción.
- Gestión segura de variables de entorno y secretos.
- Backup y restauración de base de datos y assets.
- Estrategia de migración/versionado de modelos de contenido.
- Pruebas de consumo desde frontend, mobile o BFF.
- Pruebas de permisos editoriales.
- Manejo de errores cuando el CMS no esté disponible.
- Caching y expiración de contenido cuando aplique.
- Observabilidad mínima de disponibilidad, latencia y errores.
- Revisión de licenciamiento, soporte y operación.

---

## Relación con Artefactos SDLC

| Artefacto | Uso esperado |
|---|---|
| PRD | Declarar necesidad de contenido editable por negocio |
| Historia Funcional | Describir flujos de administración, publicación y consumo de contenido |
| ADR | Justificar selección de herramienta y límites arquitectónicos |
| Historia Técnica | Definir integración, seguridad, despliegue y pruebas |
| Test Summary Report | Evidenciar pruebas de integración, permisos, caching y resiliencia |
| Release Notes | Documentar cambios de content types, endpoints, assets y operación |

---

## Decisión Evolith

Content Management Abstraction es una práctica opcional para acelerar entrega de contenido no transaccional sin degradar la arquitectura core.

Strapi Community Edition es la opción recomendada para evaluación inicial, pero Evolith mantiene la abstracción como capacidad portable. La herramienta concreta debe permanecer detrás de contratos claros, límites de responsabilidad y decisiones documentadas.

---

[Volver al Índice de Ingeniería](./README.es.md)
