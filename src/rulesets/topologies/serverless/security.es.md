# Guía de Seguridad Sin Servidor

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Roles IAM por Función

Aplicar roles IAM de privilegio mínimo a cada función. Ninguna función comparte un rol IAM con otra a menos que sus conjuntos de permisos sean idénticos. Rotar credenciales automáticamente. Auditar asignaciones de roles trimestralmente.

## Aislamiento VPC

Desplegar funciones en subnets privadas al acceder a recursos internos. Usar grupos de seguridad para restringir el tráfico de salida. Evitar subnets públicas para funciones de plano de datos. Monitorear logs de flujo VPC en busca de patrones de tráfico anómalos.

## Gestión de Secretos

Nunca incrustar secretos en paquetes de despliegue o variables de entorno en texto plano. Utilizar un almacén de secretos gestionado (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager). Rotar secretos en un calendario definido. Almacenar secretos en caché en memoria con TTL corto para reducir llamadas al almacén.

## Seguridad de Red (SV-SEC-01)

Aplicar segmentación de red entre capas de funciones. Bloquear todo acceso de entrada a Internet a menos que sea explícitamente requerido. Usar reglas WAF a nivel de API Gateway. Validar y sanitizar todas las entradas externas en el límite de la función.

## TLS Mutuo (SV-SEC-02)

Implementar mTLS para comunicación entre servicios en topologías distribuidas. Usar una autoridad de certificados compartida o proveedor mTLS gestionado. Validar certificados de cliente en la puerta de enlace de la función. Rotar certificados en un ciclo de 90 días.

## Endurecimiento del Runtime

Usar imágenes base mínimas para funciones basadas en contenedores. Aplicar parches del nivel de SO de manera oportuna. Deshabilitar características y runtimes de lenguaje no utilizados. Escanear paquetes de despliegue en busca de vulnerabilidades conocidas antes de publicar.

---

[Volver al Perfil Sin Servidor](./README.es.md)
