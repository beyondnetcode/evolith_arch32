> **Bilingual Navigation:** [View English version](./0085-agnostic-opa-wasm-distribution.md)

# ADR-0085: Arquitectura de Distribución Agnóstica de OPA Wasm

## Estado
Aceptado

## Fecha
2026-06-20

## Contexto
Evolith hace cumplir sus restricciones arquitectónicas y modelos de acceso a través de Open Policy Agent (OPA), distribuyendo estas reglas como paquetes WebAssembly compilados (`policy.wasm`).
Anteriormente, el [ADR 0099](./0099-opa-bundle-s3-distribution.es.md) (originalmente numerado 0076, renumerado para resolver un ID duplicado) establecía un modelo de distribución centrado en AWS S3. Sin embargo, exigir almacenamiento de objetos en la nube propietaria viola el principio de portabilidad agnóstica de proveedores de Evolith, especialmente para topologías on-premise, edge computing o entornos aislados (air-gapped) donde S3 no está disponible o no es deseable.

Requerimos un mecanismo estandarizado y sin bloqueo de proveedor (non-cloud-locked) para distribuir los bundles OPA a los nodos consumidores (ej. BFFs, servidores MCP Agénticos y Sidecars) de manera confiable.

## Decisión
Establecemos una **Arquitectura de Distribución Agnóstica basada en HTTP** para todos los bundles `policy.wasm` de OPA.
En lugar de acoplarse a APIs de nube propietarias, todas las topologías de despliegue DEBEN soportar uno de los siguientes patrones de distribución estándar y auto-hospedables:

1. **Servidor de Artefactos HTTP Interno (NGINX/Apache)**:
   El patrón más simple y universal. El pipeline CI/CD publica el `bundle.tar.gz` en un servidor de archivos estáticos. Los nodos consumidores lo obtienen mediante un `HTTPS GET` estándar.
   
2. **Almacenamiento de Objetos Agnóstico (MinIO)**:
   Para los equipos que requieren la API de S3 por compatibilidad de herramientas, DEBEN usar o garantizar la compatibilidad con soluciones auto-hospedables como MinIO, asegurando que la arquitectura no esté bloqueada a AWS S3.

3. **Registros OCI Estándar**:
   Dado que OPA soporta de forma nativa la descarga de bundles desde registros compatibles con OCI (Open Container Initiative), las políticas pueden empaquetarse como artefactos OCI y distribuirse mediante registros estándar (ej. Docker Hub, Harbor, GHCR).

4. **Registro NPM (Ecosistemas Node.js)**:
   Para objetivos específicos de Node.js (como nuestras herramientas MCP internas), el archivo `.wasm` puede distribuirse como un paquete NPM interno (ej. `@beyondnet/evolith-policy-bundle`) a través de Verdaccio o GitHub Packages.

## Consecuencias
### Positivas
- **Independencia del Proveedor**: Evolith puede desplegarse en cualquier entorno (AWS, Azure, On-Premise, Edge) sin modificaciones arquitectónicas en la capa de distribución de políticas.
- **Flexibilidad**: Los equipos pueden elegir el método de distribución (HTTP, OCI o NPM) que mejor se adapte a la madurez de su infraestructura específica.
- **Resiliencia**: Soluciones auto-hospedables como MinIO o NGINX pueden desplegarse en entornos aislados (air-gapped).

### Negativas
- **Sobrecarga de Infraestructura**: Los equipos on-premise deben mantener sus propios clústeres de NGINX o MinIO de alta disponibilidad para servir los bundles.
- **Ajustes de Herramientas**: Los pipelines de CI deben abstraerse para empujar artefactos a múltiples objetivos potenciales en lugar de codificar comandos `s3 sync` de la CLI de AWS de forma rígida.

> **Agent Signature:** Architect Agent
