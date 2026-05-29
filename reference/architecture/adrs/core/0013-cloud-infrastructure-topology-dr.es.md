# [ADR 0013](0013-cloud-infrastructure-topology-dr.md): Topología de Infraestructura Cloud y Recuperación ante Desastres (DR)

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Las operaciones de negocio manejadas por esta arquitectura demandan una estabilidad de ejecución continua las 24 horas del día, los 7 días de la semana. El fallo de un componente del centro de datos o un apagón amplio de una zona de disponibilidad no pueden dejar fuera de línea el procesamiento de la ruta crítica operativa durante horas manuales. Nuestro plan de distribución a través de las topologías de nube objetivo requiere definiciones de política explícitas.

## Decisión
Diseñar la topología de infraestructura apuntando a patrones Cloud-Native que impongan alta resiliencia y potencial de failover instantáneo:

1. **Orquestación Automatizada**: El despliegue evoluciona por fase arquitectónica. Mientras que la Fase 1 exige solo contenedores OCI estándar sobre cómputo simple (VMs, Compose), el despliegue en plataformas de clúster gestionadas capaces de HPA se activa estrictamente a partir de la Fase 3.
2. **Estrategia Multi-AZ**: La operación estándar ocurre de forma activo-activo a través de varias Zonas de Disponibilidad (Availability Zones) explícitas. Una región de respaldo secundaria permanece en warm-standby para un pivot de desastre inmediato.
3. **Entrada de Red Global**: Desplegar un punto unificado de ingreso externo (ej. Cloudflare/Azure Front Door) para analizar la salud y realizar redirección de enrutamiento instantánea entre regiones si se detecta degradación del clúster local.

## Consecuencias

### Positivas
- Preserva los compromisos de tiempo de actividad (uptime) sin interrupciones para las cadenas operativas corporativas globales.
- Mitiga el daño potencial de interrupciones estructurales o de zonas de proveedores.

### Negativas
- La distribución Activo-Activo duplica matemáticamente los costos de ejecución de infraestructura.
- Requiere pipelines CI/CD sofisticados diseñados para configuraciones de orquestación de múltiples objetivos.

## Referencias
- [ADR-0011: Tolerancia a Fallos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0028: Estrategia Híbrida Autohospedada](../../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)

---
[Volver al Índice](./README.es.md)
