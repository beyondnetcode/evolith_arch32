# Perfil de Proveedor: CodeQL & Trivy (Seguridad)

> **Navegación bilingüe:** [English Version](./codeql-trivy-profile.md)

**Categoría:** Escaneo de Seguridad (`security`)
**Proveedor:** GitHub (CodeQL) / Aqua Security (Trivy)
**Estado del Perfil:** Activo / Por defecto

## 1. Cobertura de Capacidades
CodeQL y Trivy se utilizan en conjunto para proporcionar un escaneo de seguridad integral en el código fuente, las dependencias y los contenedores.
Satisfacen las siguientes capacidades centrales de seguridad:
- Pruebas Estáticas de Seguridad de Aplicaciones (SAST) vía CodeQL.
- Análisis de Composición de Software (SCA) vía Trivy.
- Escaneo de vulnerabilidades de contenedores vía Trivy.
- Detección de secretos (Trivy/GitHub Advanced Security).
- Generación de SBOM (Lista de Materiales de Software).

## 2. Limitaciones y Brechas
- El tiempo de compilación de CodeQL puede ser significativo para bases de código compiladas de gran tamaño.
- Trivy depende principalmente de bases de datos de vulnerabilidades open-source, las cuales pueden tener un ligero retraso en comparación con feeds empresariales propietarios.

## 3. Modos de Despliegue
- **Soportados:** Ejecución de CLI en pipelines CI/CD, plugins de IDE.
- **Por Defecto:** Integrados directamente en los workflows de GitHub Actions.

## 4. Restricciones de Licencia y Redistribución
- **CodeQL:** Gratuito para repositorios open-source en GitHub. Los repositorios privados requieren licencias de GitHub Advanced Security.
- **Trivy:** Apache License 2.0 (Open Source).

## 5. Aislamiento de Tenants y Residencia de Datos
- El escaneo ocurre de manera efímera dentro del runner CI/CD.
- Los reportes de seguridad (archivos SARIF) se almacenan en la plataforma SCM (por ejemplo, GitHub Advanced Security), sujetos a las políticas de residencia de datos de la plataforma.

## 6. Consideraciones de Seguridad y Cumplimiento
- Los escáneres SAST/SCA deben ejecutarse en cada Pull Request dirigido a la rama principal.
- Las vulnerabilidades Críticas y Altas deben fallar el build automáticamente.
- Las salidas SARIF deben retenerse como evidencia para los gates de cumplimiento del SDLC.

## 7. Mapeo de Adaptadores y ACL
Los pipelines CI/CD de Evolith ejecutan estas herramientas y parsean sus salidas hacia registros estándar `SecurityEvidence` del SDLC, desacoplando el escáner exacto de la validación del gate de cumplimiento.

## 8. Evidencia Producida
- Archivos SARIF (Formato de Intercambio de Resultados de Análisis Estático).
- Archivos SBOM CycloneDX/SPDX.
- Códigos de salida que reflejan violaciones de políticas.

## 9. Reemplazabilidad y Migración
Estas herramientas pueden ser reemplazadas por alternativas como SonarQube, Snyk o Checkmarx.
**Ruta de Migración:**
1. Reemplazar las llamadas CLI de CodeQL/Trivy en los pipelines CI/CD con el CLI de la herramienta objetivo.
2. Asegurar que la nueva herramienta pueda exportar resultados en formato SARIF para la integración con GitHub.
3. Actualizar los gates de cumplimiento del SDLC si éstos parsean formatos SBOM específicos de la herramienta.

## 10. Fuentes Actuales y Referencias Oficiales
- [Documentación de CodeQL](https://codeql.github.com/docs/)
- [Documentación de Trivy](https://aquasecurity.github.io/trivy/)

## 11. ADRs
- Ninguno específico para esta combinación de proveedores.
