# Guía de Resiliencia del Monolito Modular

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Aislamiento de Fallos de Módulos

El monolito modular debe prevenir que la falla de un solo módulo derribe toda la aplicación. El aislamiento se impone a nivel de límite de módulo.

- **A nivel de proceso:** Todos los módulos comparten un proceso; una caída de módulo afecta todo el proceso a menos que se implemente aislamiento de fallos
- **A nivel de interfaz:** Los módulos se comunican a través de interfaces bien definidas; un módulo con fallos devuelve errores, no excepciones, a los llamadores
- **A nivel de datos:** La base de datos de cada módulo es independiente; una falla de base de datos en el módulo A no bloquea las operaciones del módulo B

**Principio de diseño:** Fallar pequeño, recuperar rápido. Cada módulo debe manejar fallas aguas arriba con gracia.

## Degradación Gradual

Cuando un módulo no está disponible, los módulos dependientes continúan operando con funcionalidad reducida en lugar de fallar completamente.

- **Respuestas de respaldo:** Los módulos proporcionan respuestas con caché o predeterminadas cuando las dependencias no están disponibles
- **Interruptores de funcionalidad:** Las funciones no críticas pueden desactivarse cuando los módulos subyacentes se degradan
- **Funcionalidad parcial:** Las operaciones principales continúan; las funciones auxiliares se degradan con gracia
- **Comunicación al usuario:** Los módulos que se degradan señalan capacidad reducida a la capa de API

```
Niveles de degradación:
  Nivel 1 — Funcionalidad completa (todos los módulos saludables)
  Nivel 2 — Funcionalidad reducida (módulo no crítico no disponible)
  Nivel 3 — Solo core (múltiples módulos degradados)
  Nivel 4 — Modo de mantenimiento (falla crítica)
```

## Interruptor de Circuito para Llamadas entre Módulos

Los interruptores de circuito previenen fallas en cascada cuando un módulo deja de responder. Cada límite de módulo implementa lógica de interruptor de circuito.

- **Estados:** Cerrado (normal) → Abierto (con fallas, rechaza llamadas) → Medio abierto (probando recuperación)
- **Umbral:** Activar después de 5 fallos consecutivos dentro de 30 segundos
- **Recuperación:** El estado medio abierto permite 3 solicitudes de prueba; el éxito cierra el circuito
- **Tiempo de espera:** Tiempo de espera predeterminado de 10 segundos por llamada entre módulos

**Configuración por par de módulos:**

| Llamador | Llamado | Tiempo de espera | Umbral | Recuperación |
|----------|---------|------------------|--------|--------------|
| order | inventory | 5s | 3 fallos | 60s |
| order | payment | 10s | 5 fallos | 120s |
| user | notification | 3s | 5 fallos | 30s |

## Aislamiento de Pools de Recursos

Cada módulo mantiene sus propios pools de recursos para prevenir que un módulo agote recursos compartidos.

- **Conexiones de base de datos:** Pools de conexiones por módulo con límites de tamaño independientes
- **Pools de hilos:** Pools de workers específicos por módulo previenen la escasez de hilos entre módulos
- **Límites de memoria:** Presupuestos de memoria a nivel de módulo impuestos mediante restricciones en tiempo de ejecución
- **Limitación de tasa:** Límites de tasa por módulo previenen que un módulo abrume el sistema

**Guía de dimensionamiento de pools:**

- Comenzar con límites conservadores por módulo
- Monitorear la utilización y ajustar según patrones de tráfico reales
- Nunca permitir que un solo módulo consuma más del 60% de cualquier recurso compartido
- Implementar contrapresión cuando los pools se acerquen a la capacidad

---

[Volver al Perfil de Monolito Modular](./README.es.md)
