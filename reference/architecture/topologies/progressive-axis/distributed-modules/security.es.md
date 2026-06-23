# Guía de Seguridad de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define las prácticas de seguridad para módulos distribuidos, cubriendo TLS mutuo, autenticación por módulo, control de acceso a nivel de contrato y gestión de secretos.

## TLS Mutuo entre Módulos

Toda la comunicación entre módulos utiliza TLS mutuo (mTLS) para garantizar la confidencialidad y autenticación a nivel de transporte. Cada módulo presenta un certificado emitido por la CA interna.

- **Ciclo de vida de certificados**: Rotación automatizada con TTL configurable; certificados aprovisionados vía CA interna.
- **Integración con malla de servicios**: mTLS aplicado en la capa sidecar o proxy donde esté disponible.
- **Fijación de certificados**: Los módulos fijan certificados de pares para rutas de comunicación de alta sensibilidad.

## Autenticación por Módulo

Cada módulo se autentica utilizando su propia identidad. No se permiten cuentas de servicio compartidas ni credenciales genéricas (DM-R03).

- **Identidad de workload**: Los módulos se autentican vía federación de identidad de workload o identidad basada en SPIFFE.
- **Autenticación basada en token**: Las llamadas entre módulos transportan tokens de corta duración delimitados a la identidad del módulo que llama.
- **Propagación de identidad**: La identidad autenticada se propaga a través de toda la cadena de llamadas para fines de auditoría.

## Control de Acceso a Nivel de Contrato

El acceso a APIs y eventos de módulos se gobierna a nivel de contrato (DM-R02). La autorización es explícita y versionada junto con el contrato.

- **Declaraciones de alcance**: Los contratos declaran alcances de autorización requeridos; los consumidores deben poseer alcances coincidentes.
- **Acceso basado en roles**: Los roles a nivel de módulo definen quién puede invocar qué versiones de contrato.
- **Registro de auditoría**: Todos los intentos de acceso se registran con identidad del llamador, versión del contrato y resultado.

## Gestión de Secretos

Los secretos se gestionan centralmente e se inyectan en los módulos en tiempo de ejecución. Ningún secreto se almacena en código, archivos de configuración o imágenes de contenedor.

- **Vault centralizado**: Los secretos se almacenan en una solución centralizada de gestión de secretos (e.g., Vault, Key Vault).
- **Inyección en tiempo de ejecución**: Los secretos se inyectan como variables de entorno o volúmenes montados en tiempo de ejecución.
- **Política de rotación**: Rotación automatizada de secretos con actualizaciones rolling de cero downtime.
- **Política de acceso**: Los secretos están delimitados a módulos específicos; el acceso cross-module requiere concesiones de política explícitas.

## Aislamiento de Datos (DM-R03)

Cada módulo es dueño de su almacén de datos. El acceso directo a bases de datos entre módulos está prohibido; el intercambio de datos ocurre solo a través de APIs o eventos publicados.

- **Propiedad de esquema**: Cada módulo define y mantiene su propio esquema de base de datos.
- **Sin tablas compartidas**: Los módulos no deben compartir tablas o esquemas de base de datos directamente.
- **Intercambio de datos vía eventos**: Las necesidades de datos cross-module se cumplen a través de eventos asíncronos o APIs de consulta.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
