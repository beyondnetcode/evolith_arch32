# Convención sobre Configuración — Estándar de Diseño Evolith para Sistemas Configurables

> **Navegación bilingüe:** [English Version](./convention-over-configuration.md)
>
> **Clasificación Evolith:** Estándar obligatorio para diseño de sistemas hijos, parametrización y configuración
>
> **Propietario:** Evolith Architecture Board
>
> **Estado:** Referencia activa
>
> **Padre:** [Centro de Estándares Corporativos](../README.es.md)

---

## Propósito

Convención sobre Configuración establece que los sistemas construidos sobre Evolith deben operar primero por convenciones claras, heredables y documentadas, y solo requerir parametrización o configuración explícita cuando exista una necesidad real de variación.

Evolith puede habilitar sistemas altamente dinámicos, multi-tenant y configurables, pero no debe promover sobreconfiguración, duplicidad de parámetros, cadenas mágicas, hardcodes ocultos o comportamientos difíciles de auditar.

---

## Principio Rector

> Primero convención, luego parametrización, finalmente configuración explícita.

Si existe una convención aprobada por Evolith, el sistema hijo debe usarla como comportamiento por defecto sin exigir configuración adicional.

La parametrización se permite cuando el comportamiento debe variar por tenant, sistema, módulo, perfil, contexto de negocio, política funcional, formato de salida, regla de seguridad o integración externa.

La configuración explícita debe ser excepcional y existir solo cuando una convención o parámetro no sea suficiente.

---

## Modelo de Resolución

```text
Solicitud de comportamiento
        |
        v
¿Existe configuración explícita válida?
        |
        +-- Sí --> Usar configuración explícita
        |
        No
        v
¿Existe parámetro por tenant?
        |
        +-- Sí --> Usar parámetro tenant
        |
        No
        v
¿Existe parámetro por sistema?
        |
        +-- Sí --> Usar parámetro sistema
        |
        No
        v
¿Existe parámetro global?
        |
        +-- Sí --> Usar parámetro global
        |
        No
        v
¿Existe convención Evolith?
        |
        +-- Sí --> Usar convención Evolith
        |
        No
        v
Valor técnico por defecto documentado
```

---

## Reglas de Precedencia

La resolución de comportamiento debe seguir este orden:

| Prioridad | Fuente | Cuándo aplica |
|---|---|---|
| 1 | Configuración explícita específica | Cuando existe una sobrescritura puntual permitida, documentada y auditable |
| 2 | Parametrización por tenant | Cuando el comportamiento varía para un tenant específico |
| 3 | Parametrización por sistema | Cuando el comportamiento varía para un sistema registrado específico |
| 4 | Parámetro global | Cuando la organización requiere cambiar la convención para todo el ecosistema o producto |
| 5 | Convención Evolith | Comportamiento estándar heredado por defecto |
| 6 | Valor técnico por defecto | Último recurso, solo si está justificado y documentado |

No se deben usar valores mágicos, hardcodes ni comportamientos ocultos para reemplazar convenciones o parámetros.

---

## Capas del Modelo

### 1. Convención Evolith

Define el comportamiento base recomendado. Aplica por defecto a todos los sistemas hijos, reduce configuración repetitiva y permite estandarización.

Ejemplos:

- Estructura estándar de módulos.
- Nombres de recursos de dominio.
- Acciones base.
- Estados estándar de entidades.
- Política default de auditoría.
- Convenciones de API.
- Convenciones UI/UX.
- Convenciones de documentación.
- Convenciones de pruebas.
- Convenciones de seeds formales.

### 2. Parámetro Global

Sobrescribe una convención para todo el ecosistema, producto o plataforma cuando exista una decisión corporativa o técnica justificada.

Debe ser versionado, auditable y documentado.

### 3. Parametrización por Sistema

Sobrescribe una convención para un sistema registrado específico.

Debe usarse cuando un sistema hijo necesita variar una política o comportamiento sin afectar otros sistemas.

### 4. Parametrización por Tenant

Sobrescribe una convención para un tenant específico.

Debe usarse cuando un tenant requiere personalización funcional, visual, operativa o de seguridad permitida por el modelo de producto.

### 5. Configuración Explícita

Define una sobrescritura concreta no cubierta por convención ni parámetros estándar.

Debe ser excepcional, estar justificada y tener un dueño responsable.

---

## Cuándo Crear un Parámetro

Crear un parámetro solo cuando se cumpla al menos una condición:

- El comportamiento cambia por tenant.
- El comportamiento cambia por sistema.
- El comportamiento cambia por política corporativa.
- El comportamiento requiere administración desde UI.
- El comportamiento debe auditarse.
- El comportamiento debe formar parte del auth graph.
- El comportamiento debe variar entre clientes o contextos.
- El comportamiento afecta seguridad, visibilidad, formato, activación o integración.

No crear parámetros para valores que son convenciones estables, técnicas, universales o propias del framework.

---

## Cuándo Mantener una Convención

Mantener una convención cuando:

- El comportamiento es universal para sistemas hijos.
- La variación no agrega valor real.
- La configuración generaría duplicidad o ruido operativo.
- El valor puede derivarse de naming, metadata, estructura o taxonomía.
- El comportamiento forma parte de la identidad técnica de Evolith.
- El equipo no necesita modificarlo desde UI ni por tenant.
- El cambio requeriría ADR o decisión arquitectónica, no parametrización operativa.

---

## Matriz de Decisión

| Elemento | Comportamiento actual | Debe ser convención | Debe ser parámetro | Scope recomendado | Justificación | Acción |
|---|---|---:|---:|---|---|---|
| Estructura estándar de módulos | Puede variar por implementación | Sí | No | Evolith | Reduce divergencia entre sistemas hijos | Documentar convención base |
| Naming de recursos de dominio | Frecuentemente manual | Sí | No | Evolith | Mejora consistencia, búsqueda y trazabilidad | Formalizar reglas de naming |
| Acciones base CRUD / dominio | Puede duplicarse en cada sistema | Sí | Condicional | Evolith / Sistema | Las acciones base son estándar; extensiones pueden variar por sistema | Definir acciones base y política de extensión |
| Formato default del auth graph | Puede implementarse ad hoc | Sí | Condicional | Evolith / Sistema | Debe existir formato base; variaciones requieren justificación | Documentar formato base y extensiones permitidas |
| Política default de auditoría | Puede configurarse repetidamente | Sí | Sí | Global / Tenant | La auditoría base debe existir; intensidad puede variar | Convención base + parámetros auditables |
| Estados estándar de entidades | Puede codificarse localmente | Sí | No | Evolith | Evita estados divergentes y hardcodes | Crear catálogo estándar |
| Activación / desactivación / suspensión / eliminación lógica | Puede variar sin control | Sí | Condicional | Evolith / Sistema / Tenant | Base estándar con excepciones justificadas | Definir transición estándar y overrides permitidos |
| Tenants nuevos | Puede requerir configuración manual | Sí | Sí | Global / Tenant | Deben heredar defaults y permitir personalización | Crear plantilla de inicialización |
| Menús base UMS | Puede estar hardcodeado | Sí | Sí | Sistema / Tenant | Base común con personalización por tenant | Definir convención + parámetros UI |
| Templates base de permisos | Puede duplicarse por cliente | Sí | Sí | Evolith / Sistema / Tenant | Base estándar con variantes controladas | Crear catálogo de templates |
| Reglas base de perfiles | Puede variar sin trazabilidad | Sí | Sí | Sistema / Tenant | Requiere gobernanza por seguridad | Documentar defaults y overrides |
| Convenciones UI/UX | Puede fragmentarse | Sí | Condicional | Evolith / Sistema | Base visual y de interacción común | Documentar tokens y patrones |
| Convenciones de API | Puede variar por equipo | Sí | No | Evolith | Deben ser uniformes | Referenciar estándar API |
| Convenciones de documentación | Puede omitirse | Sí | No | Evolith | Requerido para trazabilidad | Integrar con SDLC documentation |
| Convenciones de pruebas | Puede variar por módulo | Sí | Condicional | Evolith / Sistema | Baseline común con ajustes por criticidad | Integrar con quality gates |
| Seeds formales | Puede estar oculto o hardcodeado | Sí | Sí | Evolith / Sistema / Tenant | Seeds base deben ser reproducibles; datos variables deben parametrizarse | Crear regla de seeds formales |

---

## Convenciones Evolith Propuestas

Los sistemas hijos deben heredar como mínimo:

- Estructura base de módulos.
- Convenciones de naming para dominios, recursos, endpoints, permisos y eventos.
- Estados base de entidades.
- Acciones base de operación.
- Política default de auditoría.
- Regla default de eliminación lógica.
- Plantilla base de tenant nuevo.
- Plantillas base de permisos y perfiles.
- Convenciones de API.
- Convenciones UI/UX cuando el sistema tenga interfaz.
- Convenciones de documentación SDLC.
- Convenciones de pruebas unitarias, integración y E2E.
- Convenciones de seeds formales y reproducibles.

---

## Parámetros que Sí Deben Existir

Deben existir parámetros cuando controlen variaciones reales como:

- Políticas por tenant.
- Políticas por sistema.
- Activación/desactivación de capacidades.
- Formatos de salida.
- Visibilidad de menús o módulos.
- Variantes de perfil o permiso.
- Reglas de seguridad ajustables.
- Integraciones externas.
- Configuración funcional auditada.
- Defaults de onboarding de tenants cuando sean editables por administración.

---

## Configuraciones Innecesarias a Eliminar

Deben eliminarse o migrarse a convención cuando:

- Repiten el mismo valor en todos los tenants.
- Repiten el mismo valor en todos los sistemas.
- Representan naming, estructura o comportamiento universal.
- Son valores técnicos que nunca se administran desde UI.
- Son parámetros creados solo para evitar documentar una convención.
- Duplican un comportamiento ya definido por estándar Evolith.

---

## Hardcodes a Convertir en Convención Documentada

Convertir a convención cuando el valor sea estable y universal:

- Nombres base de módulos.
- Acciones base.
- Estados estándar.
- Prefijos o sufijos de recursos.
- Reglas base de naming.
- Estructura de seeds base.
- Rutas internas derivables por convención.
- Formatos base de documentación o pruebas.

---

## Hardcodes a Convertir en Parámetros

Convertir a parámetro cuando el valor cambie por contexto:

- Reglas por tenant.
- Reglas por sistema.
- Textos visibles administrables.
- Políticas de seguridad variables.
- Visibilidad de menú por cliente.
- Integraciones externas.
- Formatos de salida por cliente.
- Límites operativos configurables.
- Templates de permisos o perfiles que varían por tenant.

---

## Reglas para Sistemas Hijos

Todo sistema hijo basado en Evolith debe:

- Heredar convenciones base.
- Documentar qué convenciones adopta sin cambios.
- Documentar qué convenciones sobrescribe.
- Justificar cada sobrescritura.
- Registrar parámetros solo cuando exista necesidad real de variación.
- Evitar cadenas mágicas, hardcodes y configuraciones duplicadas.
- Mantener trazabilidad entre convención, parámetro y comportamiento final.
- Ejecutar revisión de sobreconfiguración durante diseño y validación.

---

## Impacto en UMS

UMS debe tratar este estándar como referencia aplicada para:

- Tenants nuevos.
- Menús base.
- Templates de permisos.
- Reglas de perfiles.
- Auth graph.
- Parámetros globales.
- Parámetros por sistema.
- Parámetros por tenant.
- Seeds formales.
- Configuración funcional administrable.

La implementación UMS debe evitar que todo comportamiento se vuelva parametrizable por defecto. Primero debe identificar la convención base y luego habilitar sobrescrituras cuando aporten valor real.

---

## Impacto en Sistemas Hijos

Los sistemas hijos deben poder arrancar con defaults heredados de Evolith. La personalización debe ser incremental, explícita y trazable.

Esto permite:

- Menor tiempo de bootstrap.
- Menos configuración repetitiva.
- Mayor consistencia entre productos.
- Menor deuda técnica.
- Mejor gobernanza multi-tenant.
- Mayor claridad para agentes de IA y equipos humanos.

---

## Validaciones Requeridas

Durante revisiones de arquitectura, PRs o auditorías, se debe validar:

- Configuraciones innecesarias que deberían ser convenciones.
- Parámetros innecesarios que deberían ser convenciones Evolith.
- Hardcodes que deberían ser convenciones documentadas.
- Hardcodes que deberían ser parámetros.
- Convenciones no documentadas.
- Parámetros sin justificación.
- Sobrescrituras por tenant o sistema sin trazabilidad.
- Diferencias incoherentes entre Evolith, UMS y otros sistemas hijos.

---

## Relación con Artefactos SDLC

| Artefacto | Uso esperado |
|---|---|
| PRD | Declarar necesidades reales de parametrización y variación por contexto |
| ADR | Justificar cambios de precedencia, nuevas capas de configuración o modelos de parametrización |
| Historia Funcional | Describir comportamiento por defecto y variaciones permitidas |
| Historia Técnica | Implementar resolución de convención/parámetro/configuración explícita |
| Test Summary Report | Evidenciar pruebas de precedencia y trazabilidad |
| Release Notes | Documentar cambios en convenciones, parámetros o comportamiento default |

---

## Pruebas Requeridas

Cuando aplique, se deben cubrir:

- Resolución por convención Evolith.
- Sobrescritura por parámetro global.
- Sobrescritura por sistema.
- Sobrescritura por tenant.
- Sobrescritura por configuración explícita.
- Ausencia de hardcodes no documentados.
- Trazabilidad del comportamiento final.
- Casos de fallback a valor técnico por defecto.

---

## Decisión Evolith

Evolith adopta Convención sobre Configuración como principio obligatorio para reducir sobreconfiguración, mejorar consistencia y acelerar la creación de sistemas hijos.

La arquitectura debe favorecer primero la convención, luego la parametrización y finalmente la configuración explícita solo cuando sea necesaria, justificada y auditable.

---

[Volver al Índice de Ingeniería](./README.md)
