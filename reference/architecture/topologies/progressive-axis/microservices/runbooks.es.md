# Guía de Manuales de Operaciones de Microservicios

> **Navegación Bilingüe:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Manual 1: Despliegue de Servicio

**Disparador:** Nueva versión lista para liberación a producción.

1. Verifique que las pruebas de contrato pasen para todos los pares consumidor-proveedor (**MS-R05**).
2. Confirme que el panel de SLO muestre un presupuesto de errores saludable (**MS-R07**).
3. Ejecute un despliegue canary (10% del tráfico) y monitoree durante 15 minutos.
4. Verifique tasas de error, latencia p99 y estados de cortacircuitos.
5. Si es saludable, promueva a despliegue completo. Si no, revierta inmediatamente.
6. Actualice el catálogo de servicios con la nueva versión y marca de tiempo de despliegue.

## Manual 2: Migración de Datos

**Disparador:** Extracción de servicio que requiere migración de base de datos.

1. Cree la base de datos y esquema del nuevo servicio.
2. Despliegue el nuevo servicio en modo de solo lectura contra la base de datos antigua.
3. Rellene los datos históricos de la base de datos antigua a la nueva.
4. Habilite escritura dual: las escrituras van a ambas bases de datos, antigua y nueva.
5. Verifique la consistencia de datos con sumas de verificación y conteos de filas.
6. Cambie las lecturas al nuevo servicio. Monitoree discrepancias.
7. Cambie las escrituras al nuevo servicio. Detenga las escrituras en la base de datos antigua.
8. De el de baja al acceso de la base de datos antigua (**MS-R06**).

## Manual 3: Respuesta a Fallas en Cascada

**Disparador:** Múltiples servicios reportan tasas de error elevadas.

1. Identifique el servicio de causa raíz mediante análisis de trazas.
2. Verifique si los cortacircuitos se activaron en servicios dependientes.
3. Habilite respuestas de fallback para rutas no críticas afectadas (**MS-R04**).
4. Aisle el servicio fallido usando controles de bloque (**MS-R03**).
5. Escale servicios ascendentes saludables si la capacidad está degradada.
6. Comunique el estado a través del canal de incidentes. Actualice la página de estado.
7. Post-resolución: revise configuraciones de tiempo de espera y presupuestos de reintento.

## Manual 4: Solución de Problemas de Malla de Servicios

**Disparador:** Conectividad intermitente, fallas de handshake mTLS o anomalías de enrutamiento.

1. Verifique que la inyección de sidecar esté activa en los pods afectados.
2. Verifique el estado de rotación de certificados mTLS en el plano de control de la malla.
3. Inspeccione las políticas de autorización para reglas excesivamente restrictivas.
4. Revise los registros del proxy Envoy para errores de conexión o tiempos de espera.
5. Valide la resolución DNS dentro de la malla para servicios afectados.
6. Si la malla está saludable, verifique independientemente la salud del servicio aguas arriba/abajo.

## Manual 5: Cambio de Contrato que Rompe Compatibilidad

**Disparador:** Un servicio proveedor necesita hacer un cambio de API que rompa compatibilidad.

1. Publique la nueva versión de API con el cambio documentado.
2. Notifique a todos los consumidores registrados a través del registro de contratos.
3. Proporcione una guía de migración y calendario (mínimo un ciclo de lanzamiento).
4. Ejecute verificación de Pact para confirmar compatibilidad del consumidor.
5. Despliegue la nueva versión junto a la antigua (dual-versión).
6. Después de la migración del consumidor, descontinúe la versión antigua con encabezado de sunset.
7. Elimine la versión antigua después del período de descontinuación.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R03** | Aislamiento de Bloques |
| **MS-R04** | Estrategias de Fallback |
| **MS-R05** | Pruebas de Contrato / Pact |
| **MS-R06** | Sin Persistencia Compartida |
| **MS-R07** | SLOs |

---
[Volver al Perfil de Microservicios](./README.es.md)
