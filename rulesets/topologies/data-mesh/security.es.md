# Guía de Seguridad de Malla de Datos

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R03, DAM-R05
**ADRs Relacionados:** ADR-0079

## Propósito

Esta guía establece las prácticas de seguridad para los productos de datos en una topología de malla. Cubre clasificación, control de acceso, manejo de PII, gobernanza federada, residencia de datos y encriptación. La seguridad es una responsabilidad federada — cada dominio aplica controles en sus productos mientras adhiere a estándares corporativos.

## Clasificación de Datos

Todos los productos de datos deben clasificarse antes de la publicación. La clasificación determina los controles de acceso, las políticas de retención y los requisitos de cumplimiento. La plataforma de autoservicio aplica metadatos de clasificación en el momento del registro.

### Niveles de Clasificación

- **Público:** Sin restricciones de acceso. Distribución externa permitida.
- **Interno:** Acceso limitado a usuarios autenticados de la organización.
- **Confidencial:** Acceso restringido a roles específicos. Registro de auditoría requerido.
- **Restringido:** Máxima sensibilidad. Encriptación en reposo y en tránsito obligatoria. El acceso requiere aprobación explícita.

## Control de Acceso por Producto

Cada producto de datos define sus propias políticas de acceso dentro del marco de gobernanza federada. Las políticas especifican qué roles, equipos o servicios pueden consumir el producto. La plataforma aplica las políticas en tiempo de consulta; los dominios las definen en tiempo de diseño.

Los equipos de dominio deben publicar políticas de acceso junto con los metadatos de su producto. Las políticas se versionan y están sujetas a los mismos requisitos de compatibilidad backward que los esquemas según DAM-R08.

## Manejo de PII

Los productos que contienen información de identificación personal deben declarar los campos PII en su esquema. La plataforma aplica enmascaramiento y tokenización según el nivel de autorización del consumidor. Los datos PII nunca deben aparecer en metadatos del índice de descubrimiento ni en vistas previas de productos.

Los equipos de dominio son responsables de mantener el registro PII y asegurar el cumplimiento con las regulaciones aplicables de protección de datos. Los campos PII requieren justificación explícita del consumidor para acceso sin enmascaramiento.

## Seguridad de Gobernanza Federada

La gobernanza federada proporciona la base de seguridad en todos los dominios. El órgano central de gobernanza define estándares mínimos de seguridad; los dominios los implementan dentro de los límites de sus productos. Las excepciones de seguridad requieren aprobación formal del consejo de gobernanza.

El intercambio de datos entre dominios requiere autenticación y autorización mutuas. La plataforma media todo el acceso interdominio a través de su capa de ejecución de políticas.

## Residencia de Datos

Los productos de datos deben declarar su residencia geográfica. La plataforma aplica restricciones de residencia en tiempo de ingesta y consulta. Las transferencias de datos transfronterizas requieren configuración explícita y documentación de cumplimiento.

Los equipos de dominio deben coordinar con el consejo de gobernanza para asegurar que las declaraciones de residencia se alineen con los requisitos regulatorios y la política corporativa.

## Encriptación

Todos los productos de datos deben encriptar datos en reposo usando los estándares organizacionales de gestión de claves. Los productos clasificados como Restringido o Confidencial requieren encriptación en tránsito usando TLS 1.2 o superior. La rotación de claves sigue el calendario centralizado de gestión de claves.

Los equipos de dominio gestionan la configuración de encriptación a través de la plataforma de autoservicio. El estado de encriptación es auditable y se publica como parte de los metadatos de salud del producto.

## Comandos de Validación

```bash
# Verificar completitud de metadatos de seguridad
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
