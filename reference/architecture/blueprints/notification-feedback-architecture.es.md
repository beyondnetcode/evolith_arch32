# Arquitectura de Notificaciones y Feedback

**Tipo:** Blueprint de Arquitectura  
**Estado:** Aceptado · Promovido desde UMS 2026-05-26  
**Runtime:** Agnóstico de framework (implementación de referencia: React + Zustand + TanStack Query)  
**Tier Evolith:** Frontend / Capa de Aplicación Cliente

---

## Propósito

Todo comando iniciado por el usuario debe producir feedback visible y accionable. Este blueprint
define el **patrón de notificación de visibilidad dual**: un sistema que expone errores de negocio
y confirmaciones a través de dos canales de visibilidad independientes con ciclos de vida diferentes.

Este patrón es agnóstico de runtime. Aplica a cualquier aplicación cliente — SPA web, shell
móvil o cliente de escritorio — que se comunique con un backend vía APIs REST o GraphQL.

---

## Planteamiento del Problema

Tres modos de fallo se repiten en todas las implementaciones cliente:

| Modo de fallo | Síntoma | Causa raíz |
|---|---|---|
| Errores de negocio silenciosos | El usuario reintenta sin saber que la acción falló | Los errores se almacenan pero nunca se exponen automáticamente |
| Mensajes de error genéricos | El usuario no puede actuar ("Algo salió mal") | El payload de error del backend no se extrae en un único punto |
| Cableado de feedback duplicado | Cada pantalla reimplementa manejo de éxito/error | No existe un wrapper de mutación compartido |

Los tres deben resolverse juntos. Resolver solo uno crea un sistema parcial que degrada
bajo uso real.

---

## Principios Arquitecturales

### P-1: Punto Único de Extracción
Existe exactamente una función responsable de transformar un error crudo en un string
legible por humanos. Ningún componente, hook o store lee `error.response` directamente.

### P-2: Estado Único de Notificación
Existe exactamente un store de notificaciones. Las notificaciones de éxito y error fluyen
por el mismo canal y son consumidas por ambas capas de visibilidad.

### P-3: Visibilidad Dual, Capas Independientes
Dos capas de presentación se suscriben al mismo store de forma independiente:
- **Capa efímera** (toast): inmediata, auto-descarte, baja carga cognitiva
- **Capa persistente** (panel de historial): auditoría, accesible bajo demanda, sobrevive la navegación

Ninguna capa conoce a la otra. Agregar o quitar una capa no impacta a la otra.

### P-4: Wrapper de Comando
Todas las mutaciones de la aplicación usan una fábrica única que enforza el contrato
de notificación. Ninguna mutación puede saltarse la fábrica.

---

## Arquitectura Lógica

```
┌────────────────────────────────────────────────────────────────┐
│                    APLICACIÓN CLIENTE                          │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │  Componente  │───►│         Wrapper de Mutación         │   │
│  │  (capa UI)   │    │  fn + invalidación + notificación   │   │
│  └──────────────┘    └──────────────────┬──────────────────┘   │
│                                         │                       │
│                                   Llamada API                   │
│                                         │                       │
│                          ┌──────────────▼──────────────────┐   │
│                          │      Extracción de Error        │   │
│                          │  (función única, un solo lugar) │   │
│                          └──────────────┬──────────────────┘   │
│                                         │                       │
│                          ┌──────────────▼──────────────────┐   │
│                          │     Store de Notificaciones     │   │
│                          │  (centralizado, tope, tipado)   │   │
│                          └────────┬─────────────┬──────────┘   │
│                                   │             │               │
│                    ┌──────────────▼──┐    ┌─────▼──────────┐   │
│                    │   Cola de       │    │  Panel de      │   │
│                    │   Toasts        │    │  Historial     │   │
│                    │   auto-descarte │    │  bajo demanda  │   │
│                    └─────────────────┘    └────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Contratos de Componentes

### Función de Extracción de Error

**Responsabilidad:** Normalizar cualquier valor lanzado (error de red, error de API, timeout)
en un string mostrable.

**Cadena de prioridad (descendente):**
1. Array de errores GraphQL — mensaje del primer error
2. Campo `detail` de REST Problem Details (RFC 7807)
3. Campo `message` de REST (legacy o personalizado)
4. Mensaje de error genérico del cliente HTTP
5. String de fallback provisto por quien llama

**Contrato:**
```
extractError(error: unknown, fallback: string): string
```

Esta función es pura. No llama ningún store ni produce efectos secundarios.

---

### Wrapper de Mutación

**Responsabilidad:** Ejecutar un comando asíncrono, invalidar claves de caché relevantes en
éxito, y llamar a `addNotification` con el tipo y mensaje correctos en ambos resultados.

**Contrato:**
```
mutationFactory({
  fn:              (vars) => Promise<T>
  invalidateKeys:  CacheKey[]
  successNotif:    (data: T)        => { title, message, type? }
  errorNotif:      (error: unknown) => { title, message, type? }
})
```

El wrapper llama a `extractError(error, errorNotif(error).message)` internamente.
El callback `errorNotif` solo necesita proveer el título y el string de fallback.

**Regla:** Toda mutación en la aplicación debe crearse a través de esta fábrica.
El uso directo del primitivo de mutación subyacente (ej. `useMutation`, `useSWRMutation`)
no está permitido en código de feature.

---

### Store de Notificaciones

**Responsabilidad:** Mantener la lista ordenada de notificaciones como estado de aplicación.

**Operaciones requeridas:**
- `add(notification)` — prepende, enforza tope de tamaño, asigna ID único y timestamp
- `markAsRead(id)` — cambia flag de leída
- `markAllAsRead()` — cambia todos los flags de leída
- `clear()` — elimina todas las entradas

**Forma de notificación:**
```
{
  id:        string    // único, inmutable
  title:     string
  message:   string
  type:      'info' | 'success' | 'warning' | 'error'
  timestamp: ISO-8601
  read:      boolean
}
```

**Tope de tamaño:** Máximo 50 entradas recomendado. Las entradas más antiguas se evictan
cuando se supera el tope.

---

### Cola de Toasts Efímeros

**Responsabilidad:** Suscribirse al store de notificaciones, detectar nuevas entradas y
renderizar toasts con auto-descarte.

**Contrato de comportamiento:**
- Detectar nuevas entradas manteniendo un set de IDs vistos (no re-disparar en `markAsRead`)
- Mostrar cada nueva notificación como un toast flotante en una posición fija de pantalla
- Auto-descartarse tras un delay específico del tipo (los errores permanecen más tiempo; los éxitos son breves)
- Permitir descarte manual anticipado que cancela el timer de auto-descarte
- Máximo toasts visibles: 3–5 (específico de implementación); los extras permanecen en historial

**Duraciones de auto-descarte sugeridas:**

| Tipo | Duración | Razonamiento |
|---|---|---|
| `error` | 5–7 s | El usuario debe leer y decidir |
| `warning` | 4–6 s | Puede requerir acción |
| `info` | 3–5 s | Informativo |
| `success` | 3–4 s | Confirmación, no requiere acción |

**Accesibilidad:** Los toasts deben usar `role="alert"` y `aria-live="assertive"` para errores,
`aria-live="polite"` para otros tipos.

---

### Panel de Historial Persistente

**Responsabilidad:** Renderizar el historial completo de notificaciones bajo demanda.

**Contrato de comportamiento:**
- Abierto por una acción explícita del usuario (ícono de campana, ítem de menú, atajo de teclado)
- Muestra conteo de no leídas como badge en el elemento disparador
- Ordenado cronológicamente inverso
- Provee operaciones de marcar-todas-como-leídas y limpiar-todo

---

## Contrato con el Backend

El servidor debe retornar RFC 7807 Problem Details para todas las respuestas `4xx` y `5xx`:

```json
{
  "type":     "https://httpstatuses.io/400",
  "title":    "Bad Request",
  "status":   400,
  "detail":   "<explicación legible por humanos>",
  "instance": "<ruta de la solicitud>",
  "traceId":  "<id de correlación>"
}
```

El campo `detail` es lo que el usuario leerá. Debe ser:
- Escrito en el idioma del usuario final (o una clave si el frontend maneja i18n)
- Accionable ("La descripción es requerida" — no "Fallo de validación")
- Libre de stack traces o identificadores internos

Si el backend no puede retornar Problem Details, actualizar solo la función de Extracción
de Error para adaptarse a la forma real. Ninguna otra capa cambia.

---

## Escenarios de Extensión

### Múltiples campos de error (FluentValidation / Bean Validation)
Agregar un paso en la función de extracción que lea el mapa `errors` y una todos los mensajes:

```
si errors es objeto:
  mensajes = flatMap(valores(errors))
  si mensajes.length > 0: retornar mensajes.join(" · ")
```

### Overrides por mutación
Permitir que `errorNotif` reciba el error y retorne títulos diferentes según código de estado:

```
errorNotif: (error) => ({
  title:   getHttpStatus(error) === 409 ? 'Conflicto' : 'Error',
  message: 'No se pudo completar la operación.',
})
```

### Actualizaciones optimistas
El wrapper de mutación puede extenderse con una opción `onMutate` que aplique una
actualización optimista de caché y la revierta en `onError` antes de llamar a `addNotification`.

---

## Anti-Patrones

| Anti-patrón | Alternativa correcta |
|---|---|
| Leer `error.response.data` dentro de un componente | Usar `extractError()` |
| `try/catch` en un componente que llama una mutación | Dejar que el wrapper maneje `onError` |
| Llamar `addNotification` directamente en un componente | Usar el wrapper de mutación |
| Mostrar un toast Y un banner para el mismo error | Elegir una capa por contexto; no duplicar |
| Store de notificaciones sin tope de tamaño | Tope en 50; stores sin límite causan crecimiento de memoria |

---

## Implementación de Referencia

Este patrón fue diseñado e implementado en el repositorio de producto **UMS**:

- Extracción de error: `src/apps/ums.web-app/src/application/errors/http-error.ts`
- Fábrica de mutaciones: `src/apps/ums.web-app/src/application/hooks/use-notified-mutation.ts`
- Store de notificaciones: `src/apps/ums.web-app/src/application/stores/notification.store.ts`
- Cola de toasts: `src/apps/ums.web-app/src/presentation/shared/components/ToastQueue.tsx`
- Panel de historial: `src/apps/ums.web-app/src/presentation/shared/components/NotificationCenter.tsx`

Tecnología usada: React 18, TypeScript, TanStack Query v5, Zustand, Axios.  
Los contratos anteriores son intencionalmente agnósticos de framework para que el patrón
porte a Angular, Vue, Svelte o mobile nativo sin cambios estructurales.

---

## Documentos Relacionados

- [Flujo de Arquitectura de Observabilidad](./observability-architecture-flow.md)
- [Tech Stack Autoritativo — Node.js](./authoritative-tech-stack-nodejs.md)

---

**[Volver al Índice de Blueprints](./README.md)** | **[English version](../blueprints/notification-feedback-architecture.md)**
