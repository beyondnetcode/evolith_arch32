# [ADR 0028](0028-self-hosted-hybrid-infrastructure-on-premise.md): Infraestructura Híbrida de Código Abierto Autohospedada

## Estado
Aprobado

## Fecha
2026-05-09

## Contexto
Confiar únicamente en proveedores de nube serverless cautivos (ej., AWS SQS, DynamoDB, Cognito) mata la capacidad de desplegar en redes corporativas soberanas de clientes desconectados (air-gapped) localmente (on-premise). Las curvas de precios en la nube se expanden salvajemente bajo un alto rendimiento. Requerimos soberanía tecnológica absoluta que se refleje sin problemas en nubes públicas Y clústeres de hardware desconectados.

## Decisión
Gobernar estrictamente la selección de herramientas internas basándose en el **Principio del 100% de Código Abierto, Autohospedable y Extensibilidad Plug-and-Play**:

1. **Infraestructura como Puerto**: NINGÚN SDK/Librería de infraestructura concreta de los productos enumerados a continuación puede cruzar jamás a las capas de Dominio/Aplicación. Deben estar estrictamente encapsulados detrás de `Ports` de TypeScript puro. Cambiar MinIO por AWS S3 o RabbitMQ por Kafka requiere editar ÚNICAMENTE un solo archivo de Adaptador de Infraestructura.
2. **MinIO (Almacenamiento de Objetos)**: Estandarizar en el motor compatible con S3. Ejecutar directamente en el clúster de Kubernetes local.
3. **RabbitMQ (Bus)**: Impulsar la comunicación asíncrona vía brókers AMQP de código abierto en lugar de colas propietarias.
4. **Vault y KeyCloak**: Manejar la distribución local nativa de secretos y pools de credenciales localizados usando ecosistemas CNCF probados.
5. **PostgreSQL/Redis Directos**: Impulsar el almacenamiento en caché y el estado a través de motores v16+ nativos desplegados vía Helm, saltándose las limitaciones de BD gestionadas envueltas por el proveedor.

## Consecuencias

### Positivas
- 100% Cloud Neutral: El código se despliega en cualquier lugar, desde el Mac de un ingeniero hasta un clúster militar aislado, con cero refactorización.
- Transparencia total de costos: Elimina las opacas facturas de escalado basadas en transacciones.

### Negativas
- Incrementa la sobrecarga administrativa. El DevOps local debe mantener la replicación, las copias de seguridad y los parches de escala que las principales nubes tépicamente manejan automáticamente.

## Referencias
- [ADR-0013: Topología Cloud](../../adrs/core/0013-cloud-infrastructure-topology-dr.md)
- [Referencia de Definición de Stack](../../blueprints/tech-stack-summary.md)

---
[Volver al Índice](./README.es.md)
