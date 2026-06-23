# Guía de Operaciones del Monolito Modular

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Unidad de Despliegue Única

El monolito modular se despliega como un artefacto único. Todos los módulos se distribuyen juntos, pero el aislamiento en tiempo de ejecución garantiza que la falla de un módulo no se propague. El pipeline de despliegue trata el monolito como una unidad cohesiva mientras preserva la observabilidad a nivel de módulo.

- **Artefacto:** Imagen de contenedor o binario único que contiene todos los módulos
- **Orden de inicio:** Los módulos se inicializan de forma independiente; la infraestructura compartida (pools de conexiones, cachés) se inicializa primero
- **Verificación de salud:** La sonda de disponibilidad a nivel de aplicación valida todos los endpoints de módulos; la sonda de preparación valida dependencias externas

## Verificaciones de Salud por Módulo

Cada módulo expone un endpoint de salud que reporta su estado interno. La agregación ocurre en el límite de la aplicación.

```
GET /health/modules/{module-id}  → { status, latency, dependencies }
GET /health/aggregate            → { overall, modules[] }
```

- La salud del módulo **no** se expone externamente; solo el endpoint agregado es público
- Los interruptores de circuito se activan cuando la salud de un monitoreo degradada más allá del umbral
- Las verificaciones de salud incluyen conectividad de base de datos, alcance del broker de mensajes y temperatura de caché en memoria

## Monitoreo de Base de Datos por Módulo

Cada módulo posee su esquema o instancia de base de datos. El monitoreo rastrea el consumo de recursos por módulo.

- Latencia de consultas por módulo (p50, p95, p99)
- Utilización del pool de conexiones por módulo
- Seguimiento del estado de migraciones (pendientes, aplicadas, fallidas)
- Detección de desviación de esquema entre entornos

**Umbrales de alerta:**

| Métrica | Advertencia | Crítico |
|---------|-------------|---------|
| Latencia p99 de consultas | > 200ms | > 500ms |
| Uso del pool de conexiones | > 70% | > 90% |
| Retraso de migraciones | > 1 pendiente | > 3 pendientes |

## Pipeline de Despliegue

El pipeline impone puertas de calidad a nivel de módulo antes de promover a producción.

1. **Compilación:** Compilar todos los módulos, ejecutar pruebas unitarias por módulo en paralelo
2. **Integración:** Ejecutar pruebas de contrato entre módulos (límites MM-R05)
3. **Staging:** Desplegar en staging; ejecutar suite de pruebas de integración
4. **Producción:** Despliegue blue-green; prueba de humo de salud agregada
5. **Reversión:** Reversión automática si la salud agregada se degrada dentro de la ventana de 10 minutos

Cada etapa debe pasar para que el pipeline continúe. Las fallas de pruebas a nivel de módulo solo bloquean las pruebas de ese módulo; las fallas entre módulos bloquean todo el pipeline.

## Registro Estructurado

Todos los módulos emiten registros estructurados con un ID de correlación que rastrea solicitudes a través de límites de módulos.

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "error",
  "module": "order-management",
  "correlation_id": "req-abc-123",
  "message": "Payment validation failed",
  "context": { "order_id": "ORD-456", "user_id": "USR-789" }
}
```

- Los ID de correlación se generan en la puerta de enlace de API y se propagan a través de todas las llamadas de módulos
- Los niveles de registro siguen: DEBUG → INFO → WARN → ERROR → FATAL
- Los datos sensibles (PII, credenciales) nunca deben aparecer en registros estructurados (MM-R08)

## Respuesta a Incidentes

Cuando ocurre un incidente, el monolito modular proporciona límites claros de aislamiento.

- **Incidentes limitados a un módulo:** Aislar el módulo afectado; otros módulos continúan sirviendo tráfico
- **Incidentes entre módulos:** Escalar a la Junta de Arquitectura; evaluar la efectividad de los interruptores de circuito
- **Incidentes de datos:** La propiedad de datos por módulo simplifica la evaluación del radio de impacto
- **Recuperación:** Reinicio a nivel de módulo sin reinicio completo de la aplicación cuando sea posible

**Ruta de escalamiento:** Equipo de módulo → Equipo de plataforma → Junta de Arquitectura → Comandante de incidentes

---

[Volver al Perfil de Monolito Modular](./README.es.md)
