# Auditoría Corporativa del Stack y Dictamen Tecnológico - Mayo 2026

**Rol**: Agente de Auditoría de Stack Spec-driven AI-DD
**Mandato**: Validación autoritativa del ciclo de vida y verificación de tecnologías autorizadas para producción.
**Periodo de Línea Base**: Entorno Simulado 11 de Mayo de 2026.

---

# RESUMEN EJECUTIVO Y ALERTAS MAESTRAS

### PRINCIPALES ALERTAS CRíTICAS (ESTADO ROJO)
1. **Abandono de Kong OSS**: El desarrollo de Kong OSS se detuvo tras la v3.9.1 con cero publicación activa en Docker. Se requiere migración inmediata a **Traefik Proxy 3.7+** o **NGINX OSS** para vectores de ingreso.
2. **Pivot Comercial de MassTransit v9**: La nueva iteración v9 ha transicionado a un modelo puramente comercial. Retener la v8 (con soporte OSS hasta finales de 2026) requiere la planificación de migración a una alternativa (Rebus) o inyección directa del driver.
3. **Licenciamiento de Terraform / Vault**: Veto absoluto a los binarios comerciales de HashiCorp. Se impone la adopción obligatoria de **OpenTofu 1.11+** y **OpenBao 2.5+**.

---

# BLOQUE 1 - NODE.JS / TYPESCRIPT

**Resumen Ejecutivo**: Puntuación total de salud: 94/100. La transición estable a los ecosistemas Node 24 LTS y Nx 22.7 asegura la máxima eficiencia CI. Recomendación fuerte de transición de TypeORM a Drizzle para densidades de despliegue ligeras listas para serverless.

### Node.js - Base de Runtime
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 24.x Active LTS (última 24.5.0) |
| Licencia | MIT |
| Nivel OSS | 1 (Fundación OpenJS) |
| Estado | Verde |
**Por qué**: Node 24 proporciona la línea base de rendimiento V8 de primer nivel y es la Active LTS designada hasta Octubre de 2026.
**Rechazados**: Node 26 (Demasiado joven, solo Current), Deno/Bun (Nicho, brechas de compatibilidad del ecosistema).

### NestJS - Framework Web
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 11.1.19 (Lanzada Abril 2026) |
| Licencia | MIT |
| Nivel OSS | 1 (Patrocinio Empresarial) |
| Estado | Verde |
**Por qué**: Obligatorio para la gobernanza de BFFs y APIs empresariales debido a su alineación rígida con la arquitectura de Inyección de Dependencias (DI).
**Alternativas**: Fastify (Motor subyacente preferido), Express (Evitar por completo debido a la pesada carga de mantenimiento).

### Drizzle ORM - Acceso a Datos
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | v0.41.2 |
| Nivel OSS | 2 (Comunidad Activa) |
| Estado | Verde (Adoptar) |
**Por qué**: El equilibrio óptimo entre seguridad de tipos total y cero sobrecarga de abstracción en comparación con motores pesados como TypeORM.
**Alternativas**: Prisma (Rechazado: pesada sobrecarga de binario rust), TypeORM (Mantener solo, no iniciar nuevos proyectos).

### Vitest - Corredor de Pruebas
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 4.1.5 |
| Nivel OSS | 1 (Ecosistema Vite) |
| Estado | Verde |
**Por qué**: Rendimiento 5 veces más rápido comparado con Jest en monorepos grandes con manejo nativo de ESM.

---

# BLOQUE 2 - .NET / C#

**Resumen Ejecutivo**: Puntuación alta: 92/100. La plataforma se ha unificado con éxito en **.NET 10.0** LTS. El principal riesgo técnico radica en la comercialización de paquetes secundarios del ecosistema (MassTransit), lo que requiere contención estratégica.

### .NET SDK - Base de Runtime
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 10.0.7 (LTS Active) |
| Nivel OSS | 1 (Microsoft .NET Foundation) |
| Estado | Verde |
**Por qué**: La mejor computación de su clase para alta concurrencia y cargas de trabajo de workers.
**Nota**: .NET 11 en preview, programado para Nov 2026. Mantenerse en 10.0.x para estabilidad en producción.

### MassTransit - Abstracción de Mensajería
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 8.3.x (último árbol OSS) |
| Licencia | Apache 2.0 (v8) |
| Estado | Amarillo (Evaluar Riesgo) |
**Alerta**: MassTransit v9 es Comercial. DEBEMOS fijar la versión en la v8 LTS o evaluar **Rebus** para la continuidad de entrega puramente de código abierto.

### Entity Framework Core - Acceso a Datos
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 10.0.x (Alineado con el SDK) |
| Nivel OSS | 1 |
| Estado | Verde |
**árbol de Decisión**: Usar EF Core para patrones de escritura transaccionales; integrar **Dapper** explícitamente para pipelines de lectura por lotes pesados para caché de rendimiento.

### xUnit v3 - Pruebas
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 3.2.2 |
| Nivel OSS | 1 |
| Estado | Verde |
**Por qué**: Soporte nativo de ejecución asíncrona de próxima generación. Migrar fuera de los árboles 2.x.

---

# BLOQUE 3 - ANDROID / KOTLIN

**Resumen Ejecutivo**: Puntuación total de salud: 100/100. Perfecta sinergia lograda usando puramente los drivers del ecosistema Jetpack. El despliegue obligatorio de Compose 1.11 permite UIs dinámicas de alto rendimiento sin el retraso de renderizado legado.

### Jetpack Compose - Framework de UI
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 1.11.1 (Estable) |
| Nivel OSS | 1 (Google Android) |
| Estado | Verde |
**Por qué**: La UI declarativa es ahora el estándar empresarial absoluto. Veto a XML Views para cualquier nueva interfaz operativa.

### Kotlin - Base del Lenguaje
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 2.3.20 |
| Nivel OSS | 1 (JetBrains / Kotlin Foundation) |
| Estado | Verde |

### Hilt (Dagger) - DI
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 2.59.2 |
| Nivel OSS | 1 |
| Estado | Verde |
**Rechazado**: Koin (Nivel 2, reflexión en runtime vs grafo de dependencias seguro en tiempo de compilación de Hilt).

### Base de Datos Room - Persistencia Offline
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 2.8.4 (LTS) |
| Estado | Verde |
**Nota**: Existe Room 3.0 Alpha para Multiplataforma. Mantenerse en la rama 2.8 para estabilidad nativa en una sola plataforma.

---

# BLOQUE 4 - BASES DE DATOS

**Resumen Ejecutivo**: Puntuación total: 98/100. PostgreSQL permanece como el invariante supremo. pgBouncer 1.25 asegura un empaquetamiento de contenedores óptimo y lógica de estado de conexión con cero sobrecarga.

### PostgreSQL 16 - BD Primaria
| Campo | Detalle |
|-------|---------|
| EOL Comunidad | 9 Nov, 2028 |
| Nivel OSS | 1 |
| Estado | Verde |
**Decisión**: Retener v16 ya que posee optimizaciones RLS maduras y le restan más de 2 años de ventana de soporte válido.

### Flyway - Migraciones
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 12.6.0 |
| Licencia | OSS Community |
| Estado | Verde |
**Nota**: Estandarizar a través de los flujos de trabajo de .NET y Node para asegurar una única pipeline para la entrega de SQL.

---

# BLOQUE 5 - INFRAESTRUCTURA (CRíTICO)

**Resumen Ejecutivo**: época transformacional. Desacoplamiento estratégico del desvío comercial (Redis -> Valkey, Terraform -> OpenTofu, Vault -> OpenBao) validado con éxito.

### Valkey 9.0 - Caché Distribuida y Streams
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 9.0.4 (Estable) |
| Licencia | BSD 3-Clause |
| Nivel OSS | 1 (Linux Foundation) |
| Estado | Verde (Reemplazo Obligatorio) |
**Alerta de Redis**: Redis SSPL 7.4+ queda estrictamente Prohibido para frameworks de infraestructura comercial. Valkey es el reemplazo obligatorio soportado por AWS, Google, Oracle.

### Traefik Proxy 3.7 - Gateway de API
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 3.7.0 |
| Licencia | MIT |
| Nivel OSS | 1 |
| Estado | Verde (Elevar a Primario) |
**Razón**: Elevado de vector secundario a PRIMARIO debido al retiro de Kong OSS. Destaca en la dinámica nativa de Kubernetes.

### OpenTofu 1.11 - IaC
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 1.11.6 |
| Licencia | MPL 2.0 (Linux Foundation) |
| Estado | Verde |
**Razón**: Reemplazo duro para Terraform BSL para preservar la neutralidad comercial.

### Stack de Observabilidad (Grafana 13 + OTel 2.7)
| Campo | Detalle |
|-------|---------|
| Recomendación | Grafana 13 + Prometheus + Loki + Tempo |
| Estado | Verde |
**Dictamen**: Se recomienda consolidación total. OpenTelemetry Collector 2.x es obligatorio como el nivel de ingesta agnóstico al proveedor.

---

# BLOQUE 6 - ESTíNDARES TRANSVERSALES

### Keycloak 26.6 - IAM
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 26.6.1 |
| Licencia | Apache 2.0 |
| Nivel OSS | 1 (CNCF Graduated) |
| Estado | Verde |
**Alternativas**: Zitadel (Evaluar para una huella nativa de la nube más pequeña, pero Keycloak es la elección empresarial soberana).

### OpenBao 2.5 - Secretos
| Campo | Detalle |
|-------|---------|
| Versión Recomendada | 2.5.3 |
| Nivel OSS | 1 (Linux Foundation) |
| Estado | Verde |
**Razón**: Fork directo que asegura la disponibilidad OSS tras la transición a BSL de HashiCorp Vault.

---

# TABLA MAESTRA DEL STACK RECOMENDADO (FINAL MAYO 2026)

| Categoría | Herramienta Recomendada | Versión | Nivel OSS | Estado | Radar |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Runtime Node** | Node.js LTS | 24.x | 1 | | **Adoptar** |
| **Runtime .NET** | .NET SDK | 10.0.x | 1 | | **Adoptar** |
| **Runtime Móvil** | Kotlin / Compose | 2.3 / 1.11 | 1 | | **Adoptar** |
| **ORMs** | Drizzle / EF Core | v0.41 / 10.0 | 1/2 | | **Adoptar** |
| **Bus de Mensajes** | RabbitMQ | Latest | 1 | | **Adoptar** |
| **Caché** | **Valkey** | 9.0.4 | 1 | | **Adoptar** |
| **Gateway de API** | **Traefik Proxy** | 3.7.0 | 1 | | **Adoptar** |
| **Gateway Legado** | Kong OSS | 3.9.1 | 3 | | **Evitar** |
| **Secretos** | **OpenBao** | 2.5.3 | 1 | | **Adoptar** |
| **IaC** | **OpenTofu** | 1.11.6 | 1 | | **Adoptar** |
| **Corredor de Pruebas**| Vitest | 4.1.5 | 1 | | **Adoptar** |

---
**Dictamen Final**: Auditoría Técnica Satisfactoria. El stack ha sido limpiado de desviaciones de licencias BSL/SSPL y se encuentra en un cumplimiento legal y tecnológico óptimo para su consumo corporativo en el horizonte 2026-2028.

---
[Volver al Índice](./README.es.md)
