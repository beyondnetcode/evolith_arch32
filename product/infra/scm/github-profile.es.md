# Perfil de Proveedor: GitHub (SCM)

> **Navegación bilingüe:** [English Version](./github-profile.md)

**Categoría:** Gestión de Control de Código Fuente (`scm`)
**Proveedor:** GitHub (Microsoft)
**Estado del Perfil:** Activo / Por defecto

## 1. Cobertura de Capacidades
GitHub actúa como el proveedor principal de Gestión de Control de Código Fuente (SCM) para los productos Evolith.
Satisface las siguientes capacidades SCM centrales:
- Control de versiones distribuido (Alojamiento Git)
- Revisión de código por pares mediante Pull Requests
- Reglas de protección de ramas y cumplimiento de criterios de fusión
- Seguimiento de problemas (integración básica de gestión de trabajo)

## 2. Limitaciones y Brechas
- Las funciones avanzadas de ALM requieren GitHub Enterprise o integraciones de terceros.
- La entrega de webhooks requiere configuración de ingress externo.

## 3. Modos de Despliegue
- **Soportados:** GitHub Cloud (SaaS), GitHub Enterprise Server (On-Premises).
- **Por Defecto:** GitHub Cloud.

## 4. Restricciones de Licencia y Redistribución
- Los repositorios open-source e internos operan bajo los términos de servicio estándar de GitHub.
- Las funciones empresariales (protecciones avanzadas de ramas, revisiones requeridas, SSO) requieren una licencia de GitHub Enterprise.

## 5. Aislamiento de Tenants y Residencia de Datos
- El aislamiento se gestiona mediante Organizaciones y Equipos de GitHub.
- La residencia de datos está sujeta a las ubicaciones geográficas de GitHub Cloud, a menos que se utilice GitHub Enterprise Server desplegado dentro de un límite aislado.

## 6. Consideraciones de Seguridad y Cumplimiento
- MFA debe ser aplicado a nivel de Organización para todos los desarrolladores.
- Los Personal Access Tokens (PATs) granulares o las GitHub Apps son preferibles a los PATs clásicos para la integración CI/CD.
- La verificación de firma de commits debe estar habilitada para repositorios críticos.

## 7. Mapeo de Adaptadores y ACL
Evolith se integra con GitHub a través del `Evolith SCM Adapter`, abstrayendo las APIs específicas de GitHub (Octokit/GraphQL) detrás de interfaces genéricas (por ejemplo, `IRepositoryProvider`, `IPullRequestReviewer`).

## 8. Evidencia Producida
- Hashes inmutables de commits (SHA-1/SHA-256)
- Evidencia de commits firmados
- Eventos de aprobación de Pull Requests (registrados vía webhooks)
- Estados de cumplimiento de protección de ramas

## 9. Reemplazabilidad y Migración
GitHub puede ser reemplazado por cualquier proveedor que soporte operaciones estándar de Git (GitLab, Bitbucket, Azure Repos).
**Ruta de Migración:**
1. Clonación tipo mirror en Git y subida al nuevo proveedor.
2. Re-implementar el `IScmAdapter` para la API REST/GraphQL de la plataforma destino.
3. Migrar los triggers de los pipelines CI/CD.

## 10. Fuentes Actuales y Referencias Oficiales
- [Documentación de GitHub](https://docs.github.com/)
- [GitHub REST API](https://docs.github.com/en/rest)

## 11. ADRs
- Ninguno específico para este proveedor; gobernado por las reglas Core de selección de SCM.
