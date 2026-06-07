# [ADR 0047](0047-actionable-user-error-contract.md): Contrato de Errores Accionables y Diagnósticos Correlacionados

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Universal — Backend API + Frontend (todos los satélites de Evolith)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0066). Promovido a línea base corporativa de Evolith.

---

## Contexto

Las APIs empresariales exponen dos riesgos de modo de fallo contrapuestos:

1. **Sobreexposición** — mensajes técnicos, detalles de excepción, nombres de clase, espacios de nombres, sentencias SQL y trazas de pila llegan al navegador o al consumidor de la API.
2. **Supresión excesiva** — una vez suprimidos todos los mensajes del backend, los errores de validación esperados se vuelven demasiado genéricos para que el usuario corrija sus datos.

Por ejemplo, un usuario que envía un valor de campo que supera el límite de longitud debe saber qué corregir y cómo. Ese usuario no debe ver un espacio de nombres, nombre de clase, detalle de base de datos o traza de pila. Los ingenieros de soporte aún necesitan una referencia que les permita localizar el evento técnico completo en el stack de observabilidad.

Este ADR aplica a todos los comandos iniciados por el usuario en los repositorios satélite de Evolith, no solo a un módulo o endpoint específico.

---

## Decisión

Adoptar un **contrato de error de dos canales**:

1. **Canal de feedback al usuario** — expone solo información de negocio o validación aprobada y accionable.
2. **Canal de diagnóstico** — retiene los detalles técnicos en logs estructurados y telemetría correlacionados mediante un identificador de error generado por el servidor.

### 1. Clasificación de Errores

| Clase de error | Ejemplo | Contenido visible al usuario | Registro técnico |
|---|---|---|---|
| Error de validación | Longitud máxima superada | Guía de corrección accionable y código de seguimiento | Evento estructurado opcional |
| Conflicto de negocio | Código único duplicado | Razón segura de negocio y código de seguimiento | Evento estructurado cuando es útil operacionalmente |
| Autorización / autenticación | Acceso rechazado | Declaración genérica de acceso segura y código de seguimiento | Evento estructurado consciente de seguridad |
| Infraestructura / inesperado | Fallo de base de datos, excepción no manejada | Guía genérica de reintento y código de seguimiento | Excepción sanitizada completa con correlación |

### 2. Payload de Error Público

Los fallos de comandos REST usan **RFC 7807 Problem Details**. Estructura del payload público:

```json
{
  "type": "https://httpstatuses.io/422",
  "title": "Error de validación",
  "status": 422,
  "detail": "La solicitud no se pudo completar porque contiene campos inválidos.",
  "userMessage": "El campo 'Codigo' tiene un formato inválido. Use solo letras, números y guion bajo.",
  "errorCode": "validation.invalid_format",
  "messageKey": "modulo.codigo_formato_invalido",
  "messageParameters": { "invalidValue": "DDDD-!" },
  "errorId": "0cd26dd6-d50e-4b3c-a662-8098a87569a4",
  "traceId": "<id-de-traza-distribuida>"
}
```

**Reglas:**

- `errorId` es un GUID generado por el servidor, único por solicitud fallida. Es obligatorio en el cuerpo de la respuesta, en el encabezado de respuesta `X-Error-Id` y en el evento de log estructurado correspondiente.
- `traceId` y `X-Correlation-Id` son identificadores de rastreo distribuido y no deben reemplazar a `errorId`.
- `userMessage`, cuando está presente, es explícitamente seguro para presentar directamente al usuario final.
- `errorCode`, `messageKey` y `messageParameters` son la ruta de evolución hacia mensajes de error totalmente localizados en el cliente.
- `detail` nunca debe contener trazas de pila, nombres de tipo de excepción, espacios de nombres, rutas de código fuente, sentencias SQL, tokens, secretos ni PII.
- Los clientes no deben mostrar `detail` arbitrario, mensajes de error brutos de GraphQL ni texto nativo de excepción. Solo muestran los campos aprobados o un fallback local.

### 3. Límite GraphQL

Los endpoints GraphQL exponen mensajes genéricos seguros y localizados con `errorId`. Las excepciones de los resolvers se registran mediante logging estructurado con el mismo `errorId`, pero nunca se serializan al cuerpo de la respuesta.

### 4. Observabilidad y Logging

- Toda respuesta fallida REST o GraphQL recibe un nuevo GUID `errorId` generado por el servidor.
- El logging estructurado registra `ErrorId` para fallos esperados y la excepción sanitizada completa con `ErrorId` para fallos inesperados.
- `CorrelationId` y `TraceId` continúan enlazando operaciones distribuidas de forma independiente al `ErrorId` orientado a soporte.
- Las reglas de logging seguro contra PII aplican antes de cualquier sink de log.

### 5. Ciclo de Vida de las Notificaciones

El feedback al usuario se entrega a través del mecanismo centralizado de notificaciones:

- El feedback de validación y negocio es accionable y puede incluir el código de seguimiento.
- La expiración automática del toast elimina la presentación efímera; el historial de notificaciones puede permanecer disponible.
- El descarte manual es una acción explícita del usuario y elimina la entrada de notificación del estado activo.

---

## Alternativas Rechazadas

**Mostrar todos los valores `detail` del backend.** Conveniente pero permite que detalles de implementación o PII escapen cuando un endpoint está mal configurado. Rechazado.

**Mostrar solo mensajes genéricos.** Impide que los usuarios corrijan condiciones de negocio o validación esperadas, aumentando los reintentos y las solicitudes de soporte. Rechazado.

**Mostrar detalles técnicos solo en desarrollo o QA.** Los entornos de QA y compartidos son superficies orientadas al usuario y pueden contener datos similares a producción. Rechazado.

---

## Consecuencias

### Positivas

- Los usuarios reciben suficiente información para corregir fallos esperados seguros sin una llamada de soporte.
- Los diagnósticos técnicos quedan disponibles para los ingenieros de soporte sin ser expuestos en la interfaz.
- El comportamiento de REST, GraphQL, logging y notificaciones frontend comparten un contrato auditable.
- El contrato puede evolucionar de texto `userMessage` renderizado por el servidor a claves de mensaje totalmente localizadas en el cliente sin romper la forma del payload de error.

### Negativas / Concesiones

- Los límites del backend deben clasificar qué fallos son seguros de publicar.
- Las nuevas reglas de validación requieren texto de visualización seguro o metadatos de localización.
- Las pruebas deben cubrir tanto la salida accionable (presencia de `userMessage`, `errorId`) como la ausencia de filtración técnica (sin trazas de pila, sin nombres de excepción).

---

## Referencias

- [ADR-0038: Patrón Result para Manejo de Errores](./0038-error-handling-result-pattern-strategy.md)
- [ADR-0045: Gestión de Estado Zustand + TanStack Query](./0045-zustand-tanstack-query-state-management.md)
- [ADR-0064 .NET: Contexto de Observabilidad de Scope de Solicitud](../dotnet/0064-dotnet-request-scope-observability-context.md)
- [ADR-0065 .NET: Pipeline Serilog Seguro contra PII](../dotnet/0065-dotnet-pii-safe-serilog-pipeline.md)

---
[Volver al Índice](./README.md)
