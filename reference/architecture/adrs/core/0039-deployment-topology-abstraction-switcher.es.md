# [ADR 0039](0039-deployment-topology-abstraction-switcher.md): Abstracción de Topología de Despliegue y Conmutador de Entorno

## 1. Estado
**Estado**: Aprobado 
**Fecha**: 2026-05-11 
**Decisores**: Junta de Arquitectura Empresarial 
**Consultados**: Equipo DevOps, Consejo de Seguridad 

---

## 2. Contexto
La Arquitectura de Referencia Corporativa está diseñada explícitamente para ser **Agnóstica al Despliegue (Principio P2)**. El mismo binario/contenedor compilado debe ser capaz de ejecutarse en dos modos operativos distintos sin requerir recompilación o ramificación de código:
1. **Modo SaaS Cloud**: Alta densidad, multi-tenant, expuesto a internet, integrado con CDN de borde y Proveedores de Identidad globales.
2. **Modo Localizado On-Premise**: Desplegado dentro de la VPN/Intranet aislada de un cliente, usando hardware local SMTP/SMS, y tablas de usuarios locales estrictas con BCrypt.

Actualmente, los límites lógicos explícitos previenen la duplicación de código, pero falta un mecanismo unificado para **cambiar los comportamientos de infraestructura dinámicamente en tiempo de ejecución**, arriesgando la proliferación de sentencias `if` dispersas por los módulos.

---

## 3. Decisión
Decretamos una estrategia de **Abstracción Estricta Dirigida por Factoría** para el intercambio de despliegue:

1. **Selector de Entorno Unificado**: Introducir una variable de entorno obligatoria `DEPLOYMENT_TOPOLOGY` con los valores enum `[SAAS_CLOUD, ON_PREMISE_ISOLATED]`.
2. **Inyección de Configuración en el Arranque**: El sistema NO DEBE contener lógica condicional dentro de los Casos de Uso de Aplicación. Todo el intercambio DEBE ocurrir a nivel del Contenedor de Inyección de Dependencias (DI) durante el arranque de la aplicación (Entrada principal).
3. **Patrón Strategy para Adaptadores**: Cualquier comportamiento que requiera controladores externos distintos (ej., SendGrid para SaaS vs SMTP Haraka Local para On-Premise) DEBE implementar un puerto `Adapter` estandarizado. El contenedor DI vinculará condicionalmente la implementación correcta basada en el token de Topología.
4. **Sobrescritura de Feature Flags**: Las banderas de configuración derivadas del interruptor de Topología DEBEN exponerse al frontend vía un endpoint de `SystemConfig`, instruyendo a los clientes de la interfaz a desactivar dinámicamente características exclusivas de SaaS (como la federación SSO global) en modo Local.

---

## 4. Alternativas Consideradas

### Opción A: Ramas específicas por entorno / binarios distintos
* **Descripción**: Mantener un repositorio o rama separado para On-Premise.
* **Razón del Rechazo**: Viola la Fuente única de la Verdad. Carga de mantenimiento masiva rastreando arreglos de bugs a través de múltiples artefactos de liberación.

### Opción B: Sentencias Condicionales En Línea (`if (mode === 'saas')`)
* **Descripción**: Comprobar el modo de despliegue directamente dentro de los métodos del servicio.
* **Razón del Rechazo**: Violación desastrosa de SOLID y Arquitectura Limpia. Contamina la lógica core con conocimiento del entorno, volviendo las pruebas altamente complejas.

---

## 5. Consecuencias

### Positivas
* **Despliegue Sin Recodificación**: La misma imagen Docker corre en la nube de producción O dentro de un centro de datos corporativo privado.
* **Lógica Limpia**: La lógica de negocio permanece 100% pura e ignorante de dónde reside físicamente.
* **Configuración Predecible**: La configuración de infraestructura se centraliza en ConfigMaps de Kubernetes y montajes de Vault.

### Negativas / Deuda Técnica
* **Superficie de Configuración Incrementada**: Los equipos de DevOps deben configurar explícitamente los Valores de Helm para impulsar correctamente la lógica de inyección en el arranque para ambas matrices.

---

## 6. Verificación y Cumplimiento
* **Puerta**: Las pruebas unitarias deben instanciar ambas variantes del adaptador para garantizar un cumplimiento de contrato idéntico.
* **Checklist de Cumplimiento**: Un Pull Request que introduzca una dependencia de infraestructura DEBE incluir la lógica de vinculación dinámica dentro de la factoría central `InfraModule`.

---
[Volver al Índice](./README.es.md)
