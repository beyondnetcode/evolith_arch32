# Perfil de Proveedor: GitHub Actions (CI/CD)

> **Navegación bilingüe:** [English Version](./github-actions-profile.md)

**Categoría:** Integración y Despliegue Continuo (`ci-cd`)
**Proveedor:** GitHub Actions (Microsoft)
**Estado del Perfil:** Activo / Por defecto

## 1. Cobertura de Capacidades
GitHub Actions proporciona automatización de pipelines CI/CD desencadenados por eventos del repositorio.
Satisface las siguientes capacidades centrales de CI/CD:
- Pipelines automatizados de construcción, prueba y empaquetado
- Estrategias de ejecución de matriz
- Trabajos de despliegue específicos de entorno
- Inyección de secretos y federación OIDC
- Workflows reutilizables y acciones compuestas

## 2. Limitaciones y Brechas
- Las ejecuciones de acciones tienen límites máximos de duración.
- La UI para la visualización de pipelines complejos (por ejemplo, DAGs) es limitada en comparación con herramientas dedicadas de despliegue.
- Los permisos granulares para runners auto-hospedados requieren un estricto aislamiento de red.

## 3. Modos de Despliegue
- **Soportados:** Runners hospedados por GitHub, Runners auto-hospedados.
- **Por Defecto:** Runners hospedados por GitHub para cargas de trabajo estándar; Runners auto-hospedados para tareas que requieren acceso VPC o hardware especializado.

## 4. Restricciones de Licencia y Redistribución
- El uso se factura por minuto para repositorios privados en runners hospedados por GitHub.
- Los runners auto-hospedados son gratuitos pero incurren en costos de computación externa.
- Las acciones personalizadas deben ser auditadas para el cumplimiento de licencias open-source.

## 5. Aislamiento de Tenants y Residencia de Datos
- Los workflows se ejecutan en VMs efímeras (hospedados por GitHub).
- Los runners auto-hospedados deben configurarse como efímeros para evitar contaminación entre tenants y entre trabajos.

## 6. Consideraciones de Seguridad y Cumplimiento
- Preferir OpenID Connect (OIDC) sobre secretos de larga duración para la autenticación en la nube.
- Las acciones de terceros deben estar fijadas a SHAs de commits específicos para prevenir ataques de cadena de suministro.
- Los entornos deben utilizar reglas de protección (revisores requeridos) para los despliegues de producción.

## 7. Mapeo de Adaptadores y ACL
La abstracción CI/CD de Evolith (`IPipelineEngine`) mapea disparos de workflows de GitHub Actions, estados de ejecución y descargas de artefactos a través de la API de GitHub.

## 8. Evidencia Producida
- ID y URL de ejecución del workflow
- Logs de ejecución de pasos
- Artefactos de build (binarios empaquetados, imágenes Docker)
- Registros de aprobación de entornos

## 9. Reemplazabilidad y Migración
GitHub Actions puede ser reemplazado por GitLab CI, Azure Pipelines o Jenkins.
**Ruta de Migración:**
1. Traducir la sintaxis YAML de `.github/workflows/` al formato del motor objetivo.
2. Reemplazar las acciones de terceros de GitHub con scripts o plugins equivalentes en el nuevo entorno.
3. Actualizar políticas de confianza OIDC en los proveedores de nube.

## 10. Fuentes Actuales y Referencias Oficiales
- [Documentación de GitHub Actions](https://docs.github.com/es/actions)
- [Fortalecimiento de Seguridad para GitHub Actions](https://docs.github.com/es/actions/security-guides/security-hardening-for-github-actions)

## 11. ADRs
- Ninguno específico para este proveedor.
