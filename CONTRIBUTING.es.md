# Contribuyendo a Evolith Core

Bienvenido a **Evolith Core**! Estamos encantados de que tengas interés en contribuir.

Evolith no es una plantilla convencional de inicio de aplicaciones. Es un **marco de gobernanza arquitectónica ejecutable** — un conjunto vivo de leyes técnicas, ADRs, políticas OPA y definiciones de Agentes de IA que actúan como la referencia corporativa para los productos satélite.

Para asegurar que todo fluya sin fricciones, por favor toma un momento para revisar nuestro modelo único de contribución.

## 1. El Método BMAD y los Agentes de IA

En el core utilizamos estrictamente el **Método BMAD** (Desarrollo impulsado por IA y basado en Especificaciones). Esto significa que no tienes que codificar o escribir documentación solo. Puedes (y debes) invocar a nuestros agentes de IA especializados desde tu IDE o prompts para que te asistan:

- **Winston (Arquitecto Principal):** Úsalo para auditorías arquitectónicas profundas y tracking de GAPs.
- **Agente Arquitecto:** Ayuda a definir contratos Data Mesh, patrones Event-Driven, y a redactar ADRs.
- **Agente Desarrollador:** Ayuda a implementar patrones seguros (OWASP) y código distribuido.
- **Agente QA:** Asiste en las pruebas de contratos y validación de políticas Rego.
- **Agente DevOps:** Ayuda a orquestar despliegues distribuidos y flujos de GitHub Actions.
- **Agente Docs:** Gestiona traducciones y validaciones estructurales markdown.

*Para una orientación detallada, revisa nuestra [Guía de Inicio Rápido](./reference/governance/standards/onboarding/product-quick-start.es.md).*

## 2. Las Reglas de Oro de Evolith

Antes de enviar un Pull Request, debes adherirte a estas reglas absolutas:

### A. Paridad Bilingüe Obligatoria
Evolith opera globalmente. **Cada archivo de documentación debe tener una versión en inglés (`.md`) y otra en español (`.es.md`).** Ambas deben ser estructuralmente idénticas (misma cantidad de encabezados `##` y `###`). El Agente Docs puede asistirte con esta traducción.

### B. Agnosticismo Arquitectónico
A menos que estés editando un *Authoritative Tech Stack Profile* específico, mantén la referencia agnóstica. No asumas un runtime, framework o proveedor cloud específico en los estándares base sin un ADR aprobado.

### C. Quality Gates de Validación
Debes validar tu trabajo localmente. Nuestros pre-commit hooks de `.husky` revisarán tu trabajo, pero deberías ejecutar estos scripts manualmente antes de hacer commit:

```bash
# Valida todos los enlaces Markdown, anclas y diagramas Mermaid
node .harness/scripts/ci/01-validate-docs.mjs

# Verifica la paridad estructural bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

Si estos scripts fallan, el pipeline de CI bloqueará tu PR.

## 3. Proceso de Pull Request

1. **Ramificación (Branching):** Sigue el [ADR-0050](./reference/architecture/adrs/core/0050-gitflow-branching-strategy.es.md). Prefija tus ramas correctamente (ej. `feature/`, `docs/`, `fix/`).
2. **Actualización de ADRs:** Si tu PR introduce un cambio arquitectónico o una nueva herramienta, *debe* ir acompañado de una actualización a un ADR existente o un nuevo ADR según el [ADR-0068](./reference/architecture/adrs/core/0068-documentation-release-gitflow.es.md).
3. **Mensajes de Commit:** Usamos versionamiento semántico y release-please. Tus commits deben seguir la especificación [Conventional Commits](https://www.conventionalcommits.org/) (ej. `feat:`, `docs:`, `fix:`).
4. **Revisión de Código:** Todos los PR requieren revisión. Nuestros flujos automatizados publicarán en tu PR el impacto de cobertura y los resultados de validación estructural.

## 4. Configuración del Entorno Local

Dado que Evolith depende de scripts de validación y reglas OPA:

1. Clona el repo: `git clone https://github.com/beyondnetcode/evolith_arch32.git`
2. Instala dependencias: `npm install`
3. Realiza tus cambios apoyándote en los agentes de IA.
4. Ejecuta validaciones: `npm run validate` (o ejecuta los scripts directamente).

Gracias por ayudarnos a evolucionar el core!
