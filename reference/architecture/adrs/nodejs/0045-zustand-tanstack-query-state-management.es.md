# [ADR 0045](0045-zustand-tanstack-query-state-management.md): Gestión de Estado en Frontend — Estrategia Dual Zustand + TanStack Query

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Pila tecnológica — Gestión de Estado en Frontend (React / TypeScript)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0057). Promovido a línea base corporativa de Evolith.

---

## Contexto

Las aplicaciones React de esta plataforma deben gestionar dos tipos fundamentalmente diferentes de estado:

1. **Estado del servidor** — datos obtenidos de APIs (entidades de negocio, listas paginadas). Requiere caché, re-obtención en segundo plano, deduplicación e invalidación de caché tras mutaciones.
2. **Estado del cliente** — preferencias de interfaz y datos de sesión (tema, idioma activo, cola de notificaciones, sesión autenticada). Requiere reactividad, persistencia opcional y un modelo de actualización predecible.

Usar una única solución para ambas categorías conduce a sobre-ingeniería (estado del servidor en un store Redux) o sub-ingeniería (estado del cliente con `useState` manual y lógica de fetch artesanal).

---

## Decisión

Adoptar una estrategia de gestión de estado **dual**:

### Estado del Servidor — TanStack Query (React Query)

TanStack Query es la solución canónica para todos los datos que provienen de un endpoint de API.

```typescript
// Las consultas se almacenan en caché, deduplicán y se re-obtienen en segundo plano
const { data, isLoading } = useQuery({
  queryKey: ['recurso', pagina, filtros],
  queryFn: () => servicio.obtenerTodos(pagina, filtros),
  staleTime: 30_000,
});

// Las mutaciones invalidan consultas y generan notificaciones
const mutacion = useNotifiedMutation({
  mutationFn: (payload) => servicio.crear(payload),
  invalidateKeys: [['recurso']],
  successNotif: () => ({ title: 'Creado', message: 'Registro creado correctamente' }),
  errorNotif: (err) => ({ title: 'Error', message: getHttpErrorMessage(err) }),
});
```

### Estado del Cliente — Zustand

Zustand es la solución canónica para todo estado que no proviene de una API.

```typescript
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
    }),
    { name: 'preferencia-tema' },
  ),
);
```

### Categorías Canónicas de Stores de Cliente

| Store | Propósito | Persistencia |
|---|---|---|
| `auth.store` | Sesión autenticada, identidad del usuario | No (solo sesión) |
| `theme.store` | Preferencia modo oscuro/claro | Sí (localStorage) |
| `notification.store` | Cola de notificaciones en app (límite ≤ 50) | No (solo sesión) |
| `i18n.store` | Código de idioma activo de la interfaz | No (sincronizado desde parámetros de sesión) |
| `devTools.store` | Overrides solo para desarrollo | No (solo desarrollo) |

### Reglas

1. **Los datos del servidor pasan por TanStack Query.** Las respuestas de API no deben almacenarse en Zustand.
2. **El estado de la interfaz pasa por Zustand.** Tema, idioma, notificaciones y estados de apertura de modales no se cachean en TanStack Query.
3. **Sin manipulación del DOM en stores.** Los stores contienen estado puro. Los componentes manejan los efectos secundarios del DOM en respuesta a cambios de estado.
4. **Única fuente de verdad.** Cada dato reside en exactamente un lugar.
5. **Los stores de desarrollo están aislados.** Los stores de overrides de desarrollo no deben afectar flujos de código en producción; proteger con `import.meta.env.DEV`.

### Patrón `useNotifiedMutation`

Todas las operaciones que mutan estado deben seguir un patrón unificado:

1. Ejecutar la función de mutación.
2. Invalidar las claves de TanStack Query relevantes.
3. Despachar una notificación de éxito al store de notificaciones.
4. Despachar una notificación de error en caso de fallo.

---

## Consecuencias

### Positivas

- Caché automático, re-obtención en segundo plano y deduplicación para datos del servidor.
- Estado del cliente simple y sin código repetitivo con Zustand.
- Separación clara de responsabilidades entre estado de servidor y de cliente.
- El middleware `persist` gestiona la persistencia en localStorage sin código personalizado.
- `useNotifiedMutation` elimina el código repetitivo de mutaciones y estandariza el feedback al usuario.

### Negativas / Concesiones

- Dos librerías que aprender y mantener.
- La gestión de claves de TanStack Query requiere disciplina de equipo para evitar datos obsoletos o invalidaciones omitidas.
- Los stores de Zustand no son serializables por defecto a menos que se use el middleware `persist`.

---

## Referencias

- [ADR-0044: Límites de Capas — Arquitectura Limpia en Frontend](./0044-frontend-clean-architecture-layer-boundaries.es.md)
- [ADR-0047: Contrato de Errores Accionables para el Usuario](./0047-actionable-user-error-contract.es.md)






## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
