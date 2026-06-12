# ADR 0072: Almacenamiento UTC de Fechas, Detección de Zona Horaria del Navegador y Resolución de Idioma

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Universal — Todos los sistemas satélite de Evolith (actuales y futuros)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0076). Promovido a estándar raíz corporativo de Evolith.

---

## Contexto

Los sistemas distribuidos que abarcan múltiples países y zonas horarias deben manejar fechas, horas y preferencias de idioma de forma consistente en todas las capas. Sin un estándar explícito, los equipos toman decisiones incompatibles: algunos almacenan tiempos locales, algunos usan el formato predeterminado del navegador, algunos codifican identificadores de idioma. Cuando los datos cruzan límites de sistema o se muestran a usuarios en diferentes zonas horarias, estas inconsistencias causan errores de visualización, discrepancias en las auditorías y fallos de cumplimiento.

Tres preocupaciones independientes deben abordarse juntas porque interactúan en la inicialización de sesión:

1. **Almacenamiento de fechas y horas** — ¿debe la base de datos almacenar UTC o tiempo local?
2. **Detección de zona horaria** — ¿cómo sabe el sistema dónde está el usuario y qué zona horaria aplicar al mostrar marcas de tiempo?
3. **Resolución de idioma** — ¿qué idioma debe usar la interfaz y cuál es la cadena de prioridad cuando múltiples fuentes proporcionan una preferencia?

Todos los sistemas satélite de Evolith deben seguir el mismo estándar para que los rastros de auditoría, delegaciones y eventos entre sistemas sean interpretables sin ambigüedad de zona horaria.

---

## Decisiones

### D1 — Todas las fechas se almacenan y transmiten como UTC

**Regla:** Toda fecha o marca de tiempo almacenada en cualquier tabla de base de datos, evento de dominio, mensaje de outbox o cuerpo de respuesta de API **debe** ser UTC.

**Directrices de implementación por runtime:**

| Runtime | Regla |
|---|---|
| .NET (C#) | Usar `DateTime.UtcNow` o `DateTimeOffset.UtcNow`. Nunca usar `DateTime.Now`. |
| .NET — Nomenclatura de columnas | Sufijo de columnas UTC: `CreatedAtUtc`, `DeletedAtUtc` (nivel dominio); `CreatedAtUtc` (nivel persistencia). |
| .NET — EF Core | Registrar un `ValueConverter<DateTime, DateTime>` que fuerce `DateTimeKind.Utc` en lectura para prevenir el almacenamiento silencioso de tiempo local (especialmente en SQLite). |
| Node.js / TypeScript | Usar `new Date()` (UTC) o `Date.now()`. Nunca serializar objetos `Date` locales sin conversión UTC explícita. |
| Respuestas de API | Las cadenas ISO 8601 deben incluir el sufijo `Z` (p. ej., `"2026-06-02T15:30:00Z"`) para hacer UTC explícito para todos los consumidores. |
| Frontend | Parsear cadenas ISO con `new Date(isoString)` — JavaScript siempre interpreta las cadenas con sufijo `Z` como UTC. Nunca aplicar manualmente offsets a valores UTC antes de almacenar. |

**Justificación:** UTC es el único ancla sin ambigüedad para los sistemas distribuidos. Los tiempos locales introducen brechas de cambio de hora, ambigüedad de reloj de pared e inconsistencia entre centros de datos.

---

### D2 — La zona horaria del navegador se detecta al inicio de la sesión y se almacena en la sesión

**Regla:** Al iniciar sesión, el frontend detecta la zona horaria IANA del navegador y la almacena en el estado de sesión autenticado. Se envía al backend como el encabezado de solicitud `X-Timezone` en cada llamada a la API.

**Detección:** `Intl.DateTimeFormat().resolvedOptions().timeZone` devuelve un identificador IANA (p. ej., `"America/Lima"`, `"Europe/Madrid"`). Compatible con todos los navegadores modernos.

**Cadena de respaldo:**

| Prioridad | Fuente | Mecanismo |
|---|---|---|
| 1 (más alta) | Zona horaria IANA detectada por el navegador | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| 2 | Parámetro de tenant/sistema `UI_TIMEZONE_DEFAULT` | Configurado por el administrador, p. ej., `"America/Lima"` |
| 3 (más baja) | Valor predeterminado del sistema | `"UTC"` — solo como último recurso |

**Manejo en el backend:** El encabezado `X-Timezone` se valida contra la base de datos de zonas horarias IANA y se almacena en el contexto de la solicitud. Se usa para cualquier formato de fecha del lado del servidor (generación de informes, marcas de tiempo de correos electrónicos).

**Visualización:** Todos los valores de fecha/hora mostrados a los usuarios se convierten desde el almacenamiento UTC a la zona horaria de la sesión usando `Intl.DateTimeFormat` con una opción `timeZone` explícita.

---

### D3 — La resolución de idioma sigue una cadena de prioridad estricta

**Regla:** El idioma de la interfaz se resuelve en la inicialización de la sesión en este orden:

| Prioridad | Fuente | Mecanismo |
|---|---|---|
| 1 (más alta) | Encabezado HTTP `Accept-Language` del navegador | Leído por el `CultureMiddleware` del backend, validado contra los idiomas admitidos |
| 2 | Parámetro de tenant/sistema `UI_LANGUAGE_DEFAULT` | Leído desde la configuración en el inicio de sesión |
| 3 (más baja) | Valor predeterminado del sistema | Definido por satélite (se recomienda `"es"` para despliegues en América Latina) |

**`CultureMiddleware` del backend:** lee `Accept-Language`, extrae el código de idioma principal (primeros 2 caracteres en minúsculas: `"es-PE"` → `"es"`), lo valida contra la lista de idiomas admitidos y establece la cultura para la solicitud.

**Respuesta de inicio de sesión:** el idioma resuelto debe incluirse en el payload de respuesta del inicio de sesión (p. ej., `LoginSuccessResponse.Language`) para que el frontend pueda inicializar su store de i18n sin un segundo viaje de ida y vuelta.

**Formato de fechas:** todas las llamadas a `formatDate`, `formatDateTime` y `formatRelativeTime` **deben** recibir el idioma activo del store de i18n. Las funciones no deben usar un idioma predeterminado codificado.

---

## Consecuencias

### Positivas

- El almacenamiento UTC elimina toda ambigüedad temporal por cambio de hora, cambio de reloj e inconsistencia entre centros de datos.
- Las sesiones siempre muestran fechas en la zona horaria real del usuario sin configuración manual.
- La inicialización del idioma es automática; los usuarios ven el sistema en su idioma preferido en el primer inicio de sesión.
- Los rastros de auditoría entre sistemas comparten el mismo marco temporal de referencia, haciendo que el análisis de eventos correlacionados sea inequívoco.

### Negativas / Concesiones

- Los convertidores UTC de EF Core añaden ligera complejidad a la configuración del DbContext.
- La detección de zona horaria del navegador requiere la API `Intl` (disponible en todos los navegadores modernos — no es una restricción real).
- El encabezado `X-Timezone` añade un pequeño overhead por solicitud (cadena única, insignificante).
- La conversión de visualización de fechas (UTC → local) debe aplicarse de forma consistente. Omitirla en cualquier componente es un error silencioso — los controles de revisión de código deben verificar la visualización de fechas UTC brutas.

---

## Lista de Verificación de Implementación (por satélite)

- [ ] Todas las propiedades `DateTime` en las entidades de dominio usan `DateTime.UtcNow` (o equivalente).
- [ ] El ORM registra convertidores de valor UTC para las propiedades `DateTime`.
- [ ] Las respuestas de API usan ISO 8601 con sufijo `Z`.
- [ ] El `CultureMiddleware` lee `Accept-Language` y valida contra los idiomas admitidos.
- [ ] La respuesta de inicio de sesión incluye el idioma resuelto y la zona horaria predeterminada.
- [ ] El frontend detecta `Intl.DateTimeFormat().resolvedOptions().timeZone` al iniciar sesión.
- [ ] El frontend almacena la zona horaria en la sesión y envía el encabezado `X-Timezone` en cada solicitud.
- [ ] El store de i18n del frontend se inicializa desde los parámetros de sesión al iniciar sesión.
- [ ] Todas las llamadas a `formatDate`/`formatDateTime` pasan el idioma activo y la zona horaria de la sesión.

---

## Referencias

- [Base de Datos de Zonas Horarias IANA](https://www.iana.org/time-zones)
- [RFC 3339 — Fecha y Hora en Internet](https://tools.ietf.org/html/rfc3339)
- [ISO 8601 — Formato de fecha y hora](https://www.iso.org/iso-8601-date-and-time-format.html)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [ADR-0016: Rastro de Auditoría Inmutable de Negocio](./0016-immutable-business-audit-trail.es.md)
- [ADR-0044: Límites de Capas — Arquitectura Limpia en Frontend](../nodejs/0044-frontend-clean-architecture-layer-boundaries.es.md)




## Opciones Consideradas

- **Seleccionada:** Almacenamiento UTC de Fechas, Detección de Zona Horaria del Navegador y Resolución de Idioma
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [Base de Datos de Zonas Horarias IANA](https://www.iana.org/time-zones)
- [RFC 3339 — Fecha y Hora en Internet](https://tools.ietf.org/html/rfc3339)
- [ISO 8601 — Formato de fecha y hora](https://www.iso.org/iso-8601-date-and-time-format.html)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [ADR-0016: Rastro de Auditoría Inmutable de Negocio](./0016-immutable-business-audit-trail.es.md)
- [ADR-0044: Límites de Capas — Arquitectura Limpia en Frontend](../nodejs/0044-frontend-clean-architecture-layer-boundaries.es.md)

---
[Volver al Índice](./README.es.md)
