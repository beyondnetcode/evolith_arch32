# Guía de Patrones de Malla de Datos

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R01, DAM-R02, DAM-R06
**ADRs Relacionados:** ADR-0084, ADR-0079

## Propósito

Esta guía describe los patrones arquitectónicos centrales que definen la topología de malla de datos. Cada patrón aborda una preocupación específica — diseño de producto, gobernanza, contratos, plataforma, descubrimiento o propiedad. Estos patrones son componibles con topologías de módulos distribuidos, microservicios, event-driven, serverless y agentic-ai.

## Datos como Producto

Los productos de datos son entidades arquitectónicas de primera clase con propiedad explícita, SLAs, esquemas y gestión de ciclo de vida. Los productos no son extracciones o vistas ad-hoc — son activos gestionados gobernados por DAM-R01.

Cada producto expone una interfaz estable definida por su esquema. Los cambios siguen los requisitos de compatibilidad backward de DAM-R08. Los productos deben ser descubribles, direccionables y confiables.

## Gobernanza Federada

La gobernanza opera en dos niveles: definición central de políticas y aplicación a nivel de dominio. El órgano central de gobernanza establece estándares — clasificación, seguridad, cumplimiento — mientras los dominios los implementan dentro de los límites de sus productos.

Este patrón previene cuellos de botella de gobernanza mientras mantiene la consistencia organizacional. Las excepciones de gobernanza requieren aprobación formal y se rastrean como excepciones en el registro de gobernanza según DAM-R03.

## Contratos de Datos (DAM-R02)

Los contratos de datos son acuerdos formales entre productores y consumidores. Un contrato especifica el esquema, garantías de calidad, SLAs de frescura y políticas de acceso para un producto de datos. Los contratos se versionan y están sujetos a reglas de compatibilidad backward.

Los contratos deben ser legibles por máquina y ejecutados por la plataforma. Los acuerdos manuales no son contratos válidos. La plataforma de autoservicio media todas las operaciones del ciclo de vida de contratos.

## Contratos de Consumo (DAM-R06)

Los contratos de consumo definen cómo los consumidores acceden y usan los productos de datos. Especifican patrones de consulta, alcance de acceso y restricciones de uso. Los contratos de consumo complementan los contratos de producción documentando obligaciones del lado del consumidor.

Los consumidores deben registrar sus contratos de consumo en la plataforma. Los consumidores no registrados pueden ser bloqueados del acceso a productos hasta el registro del contrato.

## Plataforma de Autoservicio

La plataforma de autoservicio es la columna vertebral operativa de la malla. Proporciona descubrimiento, registro, ejecución de políticas, monitoreo y gestión de contratos. Los equipos de plataforma son dueños de la infraestructura; los equipos de dominio operan a través de ella.

Las capacidades de la plataforma deben incluir: registro de productos, gestión de esquemas, configuración de políticas de acceso, monitoreo de salud, rastreo de linaje y incorporación de consumidores.

## Descubrimiento y Registro (DAM-R09)

Todos los productos de datos publicados deben registrarse en el índice de descubrimiento. El registro incluye propiedad, esquema, clasificación, SLAs e información de contacto. Los productos no registrados son invisibles para los consumidores y no deben usarse para intercambio de datos interdominio.

El registro de descubrimiento es un requisito previo para la publicación. Los productos en estado de borrador se excluyen del índice de descubrimiento según DAM-R01.

## Propiedad de Dominio

Cada dominio de negocio es dueño de sus productos de datos. La propiedad incluye diseño, implementación, operación y deprecación. Los equipos de dominio son responsables de la calidad del producto, satisfacción del consumidor y cumplimiento.

Las transferencias de propiedad requieren procedimientos formales de entrega que incluyen renegociación de SLAs, notificación a consumidores y actualización de metadatos de la plataforma. La propiedad no es compartida — cada producto tiene exactamente un dominio propietario.

## Comandos de Validación

```bash
# Verificar cumplimiento de patrones
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
