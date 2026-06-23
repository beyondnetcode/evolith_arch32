# Guía de Seguridad del Monolito Modular

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Aislamiento de Módulos

Cada módulo opera dentro de un límite de aislamiento que restringe su acceso únicamente a los recursos que posee. El monolito modular impone aislamiento en la capa de aplicación, no en la capa de infraestructura.

- **Aislamiento de código:** Los módulos se comunican a través de interfaces definidas; el acceso directo a bases de datos entre módulos está prohibido
- **Aislamiento en tiempo de ejecución:** Los módulos se ejecutan en el mismo proceso pero están separados por límites de interfaz y verificaciones en tiempo de compilación
- **Aislamiento de datos:** Cada módulo posee su esquema de base de datos; las consultas entre módulos no están permitidas

## Autenticación Compartida

La autenticación se centraliza en el nivel de puerta de enlace de API. Todas las solicitudes entrantes llevan un token validado antes de llegar a cualquier módulo.

- **Validación de tokens:** Tokens JWT o OAuth 2.0 validados en la puerta de enlace; los módulos confían en la identidad validada
- **Gestión de sesiones:** Almacenamiento de sesiones centralizado compartido entre todos los módulos
- **Rotación de credenciales:** Rotación automatizada impuesta; los módulos nunca almacenan credenciales sin cifrar
- **Multifactor:** La imposición de MFA es de aplicación completa, no por módulo

## Autorización Aislada

Si bien la autenticación es compartida, la autorización está delimitada por módulo. Cada módulo aplica sus propias políticas de control de acceso.

- **Modelo de permisos:** Cada módulo define sus propios roles y permisos
- **Sin herencia de roles entre módulos:** Un rol en el módulo A no otorga acceso en el módulo B
- **Imposición de políticas:** Las verificaciones de autorización ocurren en los límites de los módulos, no en la puerta de enlace
- **Registro de auditoría:** Cada módulo mantiene su propio registro de auditoría de autorización

```
Autorización del Módulo A:
  - Admin: CRUD completo sobre recursos del módulo A
  - Viewer: acceso de solo lectura a recursos del módulo A
  - NO implica acceso al Módulo B
```

## Límites de API Internas

Los módulos exponen APIs internas que están versionadas y documentadas explícitamente. Las APIs internas no documentadas están prohibidas.

- **Contratos de API:** Cada módulo publica un contrato de API legible por máquina (OpenAPI o equivalente)
- **Versionado:** Las APIs internas siguen versionado semántico; los cambios de ruptura requieren planes de migración
- **Política de obsolescencia:** Las APIs se deprecian por un mínimo de 2 ciclos de liberación antes de su eliminación
- **Control de acceso:** Las APIs internas no son accesibles desde redes externas; solo comunicación módulo a módulo

## Sin Acceso a Datos entre Contextos

Los módulos no deben acceder directamente a los datos de otro módulo. Todas las necesidades de datos entre módulos se realizan a través de APIs publicadas.

- **Acceso directo a base de datos:** Prohibido entre límites de módulos (MM-R02)
- **Esquemas compartidos:** No permitidos; cada módulo posee su esquema exclusivamente
- **Replicación de datos:** Permitida solo a través de patrones orientados a eventos; los módulos suscriben a eventos publicados
- **Compartición temporal de datos:** Requiere contrato de API explícito; nunca a través de tablas de base de datos compartidas

**Detección de violaciones:** Las pruebas automatizadas escanean consultas de base de datos entre módulos; las violaciones fallan la compilación.

---

[Volver al Perfil de Monolito Modular](./README.es.md)
