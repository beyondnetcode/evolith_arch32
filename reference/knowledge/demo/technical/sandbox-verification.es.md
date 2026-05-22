# Alcance de Verificación del Sandbox Arquitectónico y Demo

**Objetivo:** Definir el alcance preciso de la implementación canónica (Producto To-Do) y catalogar qué patrones arquitectónicos ejercita en un entorno en ejecución.

---

## 1. El Dominio "To-Do"
Para evitar contaminar la arquitectura de referencia con lógica de negocio densa, el sandbox ejecuta un "Gestor de Tareas To-Do" simplificado. Este es elegido deliberadamente por su carga cognitiva nula, permitiendo a los desarrolladores enfocarse 100% en los **Patrones Arquitectónicos** en lugar de las complejidades del negocio.

---

## 2. Matriz de Verificación de Patrones
Las siguientes directivas del sistema (ADRs) están físicamente instanciadas y verificables en esta demo en ejecución:

| Patrón | Ubicación de Verificación en el Sandbox | Validado Por |
| :--- | :--- | :--- |
| **Límites Hexagonales** | Verificar `libs/domain/task` (cero imports de TypeORM o NestJS). | `eslint-plugin-boundaries` |
| **RLS Multi-Tenant** | Intentar `SELECT * FROM tasks` retorna cero filas a menos que `SET LOCAL app.current_tenant` sea llamado en la transacción PostgreSQL actual. | `integration-test/rls.spec.ts` |
| **CQRS Híbrido** | Crear Tarea usa `TaskRepository` (Escritura). Listar Tareas ejecuta una vista aplanada vía Query Service (Lectura). | Inspección manual de flujos. |
| **Event Sourcing (Auditoría)** | Cualquier creación de tarea emite automáticamente un `Event` capturado en `audit.audit_log`. | Panel de monitoreo de RabbitMQ. |
| **Trazado OTel** | Cada solicitud REST/gRPC genera un Span visible en la instancia local de Jaeger. | Abrir `localhost:16686` |
| **Patrón Result** | Todos los Casos de Uso retornan `Result.ok()` / `Result.fail()`. Cero sentencias `throw new Error` en la lógica del núcleo. | Validación de type-check. |

---

## 3. Gates No-Funcionales en Ejercicio
* **Contract Testing**: Ejecutar `nx test pact` realiza una verificación bidireccional que garantiza que el Web-BFF de React está de acuerdo con el payload gRPC del Core API.
* **Carga de Rendimiento**: Runners locales de k6 ejercitan la inserción de alta concurrencia de 10,000 tareas en < 5 segundos para verificar el overhead de rendimiento de RLS.

---

## 4. Limitaciones Intencionales (Fuera del Sandbox)
Para mantener la base de código liviana, lo siguiente NO está implementado en el código, pero sí documentado en la arquitectura:
1. **Distribución en la Nube**: Configuraciones específicas de DNS/Route53 en la nube.
2. **Sagas Complejas**: Sagas distribuidas que atraviesan 3+ redes externas.

---
**Estado de Verificación**: Todos los Patrones Críticos verificados y aprobados en el entorno de Sandbox local.

---
[Volver al Índice](./README.md)
