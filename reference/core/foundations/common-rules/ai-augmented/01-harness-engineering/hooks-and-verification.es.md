# Layered Verification Patterns


---

## The 4 Verification Layers
Adoptamos la siguiente jerarquía de validación basada en el tiempo de retroalimentación y el costo computacional:

| Capa | Gatillo | Tiempo estimado | Componente de arnés responsable | Ejemplo de acción |
| :--- | :--- | :--- | :--- | :--- |
| **1. Gancho PostToolUse** | Después de cada `tool_call` exitosa | Milisegundos (ms) | Tiempo de ejecución/marco | Ejecute instantáneamente el compilador linter o TS en el archivo editado. |
| **2. Gancho de confirmación previa** | `git commit` manual o activado | Segundos (s) | Ganchos de Git (Husky, gancho izquierdo) | Ejecute pruebas unitarias específicas, valide el formato del mensaje de confirmación y realice una verificación de tipos. |
| **3. Tubería de CI** | Solicitud de inserción/extracción de Git | Minutos (min) | Acciones de GitHub / GitLab CI | Conjunto completo de pruebas E2E, pruebas de contratos Pact, escaneo CodeQL/Sonar. |
| **4. Revisión humana** | Aprobación de fusión | Horas (h) | Equipo de ingeniería | Verificación final de coherencia empresarial, cumplimiento de la arquitectura y principios SÓLIDOS. |
## Early Detection Principle (Shift-Left AI)
**Cuanto más cerca se detecta el error del modelo, menos tokens se desperdician.**
Si un agente comete un error sintáctico en el paso 1 y el arnés no advierte hasta el paso 3 (CI), el agente continuará construyendo una lógica defectuosa sobre esa base, lo que resultará en una "alucinación en cascada" muy costosa de depurar.
## Technical Hook Examples

### Node.js / TypeScript (Husky + lint-staged)
En entornos de Nodo, el arnés local debe configurarse para activar el autocorrector después de las ediciones:
```json
// .lintstagedrc
{
 "*.ts": [
 "eslint --fix",
 "prettier --write",
 "jest --bail --findRelatedTests"
]
}
```

### Programmatic Hook (Agent SDK)
Si está creando un agente personalizado, el patrón de validación se ve así:
```typescript
async function onAfterFileEdit(filePath: string) {
 const { execSync } = require('child_process');
 try {
 execSync(`npx eslint ${filePath}`);
 } catch (error) {
 // Return the compilation error to the Agent for auto-repair
 throw new Error(`Linter Validation Failed: ${error.message}`);
 }
}
```

## Deterministic Validation vs LLM-Based
- **Validación determinista (Prioridad):** Compiladores, Linters, Pruebas unitarias. Resultados 100% binarios. Siempre debe ejecutarse primero.
- **Validación basada en LLM (secundaria):** Uso de un segundo modelo más pequeño para auditar el código generado (por ejemplo, detectar vulnerabilidades lógicas complejas). Úselo únicamente cuando el análisis estático sea incapaz de inferir el contexto semántico.

---
[Volver al índice](./README.md)