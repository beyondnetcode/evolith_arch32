# ADR 0076: Distribución de OPA Bundle vía S3 (MinIO)

## Estado
Aceptado

## Contexto
Según lo definido en el [ADR 0041 (Evaluación de Políticas Dual-Engine)](./0041-dual-engine-policy-evaluation.es.md), Evolith utiliza Open Policy Agent (OPA) para hacer cumplir reglas y restricciones arquitectónicas. Los componentes BFF (Backend-For-Frontend) y MCP (Model Context Protocol) también dependen de estos rulesets de forma dinámica durante el tiempo de ejecución.

Inicialmente, la estrategia consistía en usar un patrón sidecar `git-sync` para obtener constantemente las reglas desde el repositorio Git. Sin embargo, en un entorno empresarial escalado a cientos de pods, el sondeo continuo de Git introduce riesgos inaceptables:
- Alta latencia y límites de tasa (rate-limiting) en la API de Github.
- Despliegue inmediato de rulesets potencialmente defectuosos a todos los pods simultáneamente.
- Acoplamiento de la arquitectura de ejecución al tiempo de actividad del control de versiones.

## Decisión
Adoptaremos el patrón de la **API de OPA Bundle** utilizando un almacén de objetos compatible con S3 (MinIO).

1. **Bundles Inmutables (CI/CD)**: El pipeline de CI/CD (GitHub Actions) compilará las políticas `.rego` y los datos `.json` en un artefacto comprimido `bundle.tar.gz` únicamente después de que se aprueben todas las pruebas de validación.
2. **Distribución Centralizada**: El pipeline subirá este bundle versionado a un bucket seguro en MinIO (o AWS S3 / Azure Blob Storage dependiendo del perfil cloud).
3. **Consumo Desacoplado**: Los servicios en contenedor que ejecutan el motor OPA (como BFF y MCP) se configurarán vía Helm para sondear periódicamente el bucket S3 en busca de nuevos bundles, utilizando las capacidades nativas de descarga de bundles de OPA.

## Consecuencias
### Positivas
- **Altamente Escalable**: S3 está optimizado para lecturas concurrentes masivas.
- **Seguridad**: Los bundles son precompilados y probados antes de llegar a producción.
- **Capacidad de Rollback**: Los bundles versionados permiten la reversión instantánea de cambios en las reglas sin alterar el historial de Git.
- **Desacoplamiento**: Los entornos de ejecución no requieren acceso ni credenciales al repositorio Git.

### Negativas
- Requiere pasos adicionales en el pipeline de CI/CD para ejecutar `opa build` y subir artefactos a S3.
- Ligero retraso de propagación entre la fusión de una regla en `main` y su obtención por parte de los pods (basado en la frecuencia de sondeo de OPA).

> **Agent Signature:** Architect Agent
