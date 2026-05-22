# Estándar Corporativo AGENTS.md

## ¿Qué es AGENTS.md?

El archivo `AGENTS.md` es el artefacto de harness de **menor esfuerzo y mayor impacto** en un repositorio. Sirve como la "sesión de inducción" (onboarding) para cualquier agente de inteligencia artificial (Claude Code, Cursor, Copilot, agentes personalizados) que acceda al espacio de trabajo.

Un agente sin un `AGENTS.md` debe redescubrir el stack, adivinar los comandos de prueba y tropezar con antipatrones conocidos. Con `AGENTS.md`, el agente hereda instantáneamente el contexto experto acumulado por el equipo humano.

## Estructura Estándar Obligatoria

Cada repositorio que implemente Aumentación por IA de Nivel 1 o superior debe poseer un archivo `AGENTS.md` en su directorio raíz con la siguiente estricta anatomía:

```markdown
## Project (Proyecto)
[Descripción concisa de 2 líneas explicando el propósito de negocio de este proyecto]

## Build & Run (Construcción y Ejecución)
- Build: `[Comando exacto, ej., npm run build]`
- Test: `[Comando para pruebas unitarias, ej., npx nx run test my-app]`
- Lint: `[Comando de lint y fix, ej., npm run lint -- --fix]`

## Architecture (Arquitectura)
- Runtime: [Node.js vXX / .NET X.X / Android SDK XX]
- DB: [Motor, ej., PostgreSQL 16 + Drizzle ORM]
- Key modules: [Lista corta de módulos críticos o capas en este repo]

## Conventions (Convenciones)
- [Convención crítica 1, ej., Usar la Mónada Result para retornos de servicio]
- [Convención crítica 2, ej., Los componentes de UI deben ser Server Components por defecto]

## Agent Rules (Reglas del Agente)
- [Regla previniendo error conocido 1, ej., NUNCA borrar pruebas existentes para hacer pasar un fix]
- [Regla previniendo error conocido 2, ej., Si se edita una entidad de Drizzle, ejecutar 'npm run db:generate' inmediatamente]

## Out of Bounds (Fuera de Límites)
- [Qué partes del repo NO DEBEN TOCARSE, ej., No modificar archivos en la carpeta /legacy ni flujos de CI/CD]
```

## Principio de Hashimoto para el Harness
Adoptamos la regla evolutiva propuesta por el ecosistema de ingeniería agéntica:

> **"Por cada error repetitivo que el agente cometa, se debe añadir una nueva regla explícita a la sección de Agent Rules de AGENTS.md para prevenir su recurrencia perpetua."**

## Adiciones Recomendadas de Evolución

La estructura mínima anterior es obligatoria. Los repositorios maduros DEBERÍAN además agregar:

- referencias explícitas a playbooks locales del harness o runbooks recurrentes,
- notas de autoridad de runtime aclarando dónde viven las reglas oficiales del stack,
- reglas específicas de multi-tenancy, APIs o cumplimiento cuando esos errores se repiten,
- recordatorios de sincronización para actualizar `AGENTS.md` cada vez que la arquitectura o el stack cambien de forma material.

## AGENTS.md vs CLAUDE.md
- **`AGENTS.md`**: Agnóstico a la herramienta. Funciona para cualquier agente que consuma el espacio de trabajo (ej., GPT-4o con acceso a terminal, Devin, etc.).
- **`CLAUDE.md`**: Estándar específico reconocido nativamente por `claude-code`. Se recomienda que si usas Claude Code, tengas un `CLAUDE.md` que puede ser un enlace simbólico o una copia simplificada estrictamente enfocada en los comandos que Claude consume mejor.

---
[Volver al Índice](./README.es.md)
