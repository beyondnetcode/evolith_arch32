# Estándar Corporativo AGENTS.md

## ¿Qué es AGENTS.md?

El archivo `AGENTS.md` es el artefacto de arnés de **menor esfuerzo, mayor impacto** en un repositorio. Sirve como la "sesión de inducción" (onboarding) para cualquier agente de inteligencia artificial (Claude Code, Cursor, Copilot, agentes personalizados) que accede al workspace.

Un agente sin `AGENTS.md` debe redescubrir el stack, adivinar comandos de prueba, y tropezar con antipatrones conocidos. Con `AGENTS.md`, el agente hereda instantáneamente el contexto experto acumulado por el equipo humano.

## Estructura Estándar Obligatoria

Todo repositorio que implemente Nivel 1 o superior de AI-Augmentation debe poseer un archivo `AGENTS.md` en su directorio raíz con la siguiente anatomía estricta:

```markdown
<!-- ## Project -->
[Descripción concisa de 2 líneas explicando el propósito de negocio de este proyecto]

<!-- ## Build & Run -->
- Build: `[Comando exacto, ej., npm run build]`
- Test: `[Comando para tests unitarios, ej., npx nx run test my-app]`
- Lint: `[Comando de lint y fix, ej., npm run lint -- --fix]`

<!-- ## Architecture -->
- Runtime: [Node.js vXX / .NET X.X / Android SDK XX]
- DB: [Motor, ej., PostgreSQL 16 + Drizzle ORM]
- Key modules: [Lista corta de módulos críticos o capas en este repo]

<!-- ## Conventions -->
- [Convención crítica 1, ej., Usar Result Monad para retornos de servicio]
- [Convención crítica 2, ej., Los componentes UI deben ser Server Components por defecto]

<!-- ## Agent Rules -->
- [Regla previniendo error conocido 1, ej., NUNCA eliminar tests existentes para hacer pasar un fix]
- [Regla previniendo error conocido 2, ej., Si editas una entidad Drizzle, ejecutar 'npm run db:generate' inmediatamente]

<!-- ## Out of Bounds -->
- [Cuáles partes del repo NO DEBEN SER TOCADAS, ej., No modificar archivos en /legacy folder o workflows CI/CD]
```

## Principio Hashimoto para Harness

Adoptamos la regla evolutiva propuesta por el ecosistema de ingeniería agentic:

> **"Para cada error repetitivo que el agente comete, una nueva regla explícita debe ser añadida a la sección Agent Rules de AGENTS.md para prevenir su recurrencia perpetua."**

## Adiciones Evolutivas Recomendadas

La estructura mínima anterior es obligatoria. Los repositorios maduros DEBERÍAN también añadir:

- referencias explícitas a playbooks de harness locales o runbooks recurrentes,
- notas de autoridad de runtime aclarando dónde viven las reglas oficiales del stack,
- reglas específicas de producto para multi-tenancy, API, o compliance cuando esos errores se repiten,
- notas de sincronización recordando a los contribuidores actualizar `AGENTS.md` siempre que la arquitectura o el stack cambien materialmente.

## AGENTS.md vs CLAUDE.md

- **`AGENTS.md`**: Agnóstico de herramientas. Funciona para cualquier agente que consume el workspace (ej., GPT-4o con acceso a terminal, Devin, etc.).
- **`CLAUDE.md`**: Estándar específico reconocido nativamente por `claude-code`. Se recomienda que si usas Claude Code, tengas un `CLAUDE.md` que puede ser un symbolic link o una copia simplificada estrictamente enfocada en los comandos que Claude consume mejor.

---
[Volver al Índice](./README.es.md)