# Evolith Core — Guía de Incorporación para Segundo Mantenedor

> **Bilingual Navigation:** [English Version](./onboarding-second-maintainer.md)

**Propósito:** Reducir el bus factor habilitando a un segundo mantenedor humano para contribuir de forma independiente.  
**Gap:** GT-330 — un solo contribuidor con ~1.300 commits; no existía un camino formal de incorporación.

---

## 1. Resumen del Repositorio

Evolith Core es un motor de gobernanza para el cumplimiento del ciclo de vida de desarrollo de software (SDLC). Valida proyectos satélite contra rulesets de topología, gates y políticas OPA.

### Puntos de entrada clave

| Área | Ruta | Propósito |
|---|---|---|
| Lógica de dominio | `src/packages/core-domain/src/domain/` | Entidades, eventos, máquinas de estado, RBAC, veredicto |
| Capa de aplicación | `src/packages/core-domain/src/application/` | Casos de uso, servicios, puertos |
| Infraestructura | `src/packages/core-domain/src/infrastructure/` | Bus de eventos, auditoría, webhook, adaptadores |
| Servidor MCP | `src/packages/mcp-server/src/` | Definiciones de herramientas MCP y transporte |
| API REST Core | `src/apps/core-api/src/` | Superficie API NestJS |
| CLI | `src/sdk/cli/src/` | Comandos Evolith CLI |
| Rulesets | `rulesets/` | Políticas OPA + reglas de topología |
| Datos SDLC | `reference/core/sdlc/` | Definiciones JSON de fases/gates |
| ADRs | `reference/core/sdlc/governance/` | Registros de Decisiones de Arquitectura |

### Arquitectura en un párrafo

Los satélites (proyectos externos) envían evidencia a Core vía REST, MCP o CLI. Core carga las definiciones de gates SDLC (`reference/core/sdlc/gates/gate-f*.json`), resuelve las rutas de artefactos del satélite, ejecuta reglas OPA/nativas y emite un `Verdict` (PASS/FAIL/WAIVE/SKIP). Todas las decisiones se emiten como eventos de dominio, se escriben en el ledger de auditoría y se despachan a suscriptores webhook.

---

## 2. Lista de Verificación de la Primera Semana

- [ ] Clonar el repositorio y ejecutar `npm install` desde la raíz
- [ ] Ejecutar `npm test` — todas las suites deben pasar (objetivo: +500 tests en verde)
- [ ] Leer `reference/core/sdlc/governance/core/README.md` — decisiones de arquitectura
- [ ] Leer `CERTIFICACION_MADUREZ.md` — certificación de madurez actual
- [ ] Leer `reference/core/control-center/gaps/gap-tracking.md` — tablero de gaps
- [ ] Ejecutar el servidor MCP localmente: `npm run start --workspace=packages/mcp-server`
- [ ] Ejecutar el Core API localmente: `npm run start:dev --workspace=apps/core-api`
- [ ] Leer `reference/core/sdlc/README.md` — resumen del modelo SDLC

---

## 3. Invariantes Clave a Conocer

1. **Core no almacena configuración de tenant** — toda la composición de tenant fluye a través de `ValidateWorkflowUseCase` con un `WorkflowDefinition` suministrado por el llamador.
2. **Fuente canónica de gates** — `reference/core/sdlc/gates/gate-f*.json` (no `rulesets/phase-gates/phase-gates.rules.json`).
3. **Ubicación canónica de topologías** — `src/rulesets/topologies/` (las 8 topologías; los directorios de `reference/core/architecture/topologies/` tienen stubs `RELOCATED.md`).
4. **Veredicto canónico** — enum `Verdict` (`PASS|FAIL|WAIVE|SKIP`) en `src/packages/core-domain/src/domain/verdict/verdict.ts`.
5. **Bus de eventos es aditivo** — `IDomainEventBus` es opcional en todos los casos de uso; su ausencia no rompe flujos existentes.
6. **Paridad bilingüe** — cada documento en inglés debe tener una contraparte `*.es.md`.

---

## 4. Realizando tu Primera Contribución

1. Elegir un gap de `reference/core/control-center/gaps/gap-tracking.md` marcado como `PENDING`.
2. Leer su entrada en `gap-reference-catalog.md` para los criterios de cierre.
3. Crear una rama: `git checkout -b feat/gt-NNN-descripcion-corta`.
4. Escribir código + tests; apuntar a ≥80% de cobertura de ramas en archivos tocados.
5. Verificar que CI pasa localmente: `npm test && npm run lint:boundaries --workspaces`.
6. Abrir un PR — CI se ejecuta automáticamente (`governance-ci.yml`, `ci-cd.yml`).

---

## 5. Ejecutar la Suite Completa de Tests

```bash
# Todos los tests unitarios
npm test

# Tests E2E (core-domain)
npm run test:e2e --workspace=packages/core-domain

# Gate de paridad OPA
EVOLITH_PARITY_FULL=true node .harness/scripts/ci/27-opa-parity-gate.mjs

# ESLint boundaries
npm run lint:boundaries --workspace=packages/core-domain
npm run lint:boundaries --workspace=packages/mcp-server
npm run lint:boundaries --workspace=apps/core-api
```

---

## 6. Contactar al Mantenedor Principal

| Canal | Detalles |
|---|---|
| Commits git | `Alberto Arroyo Raygada` — ver `git shortlog -sn` |
| GitHub | Propietario del repositorio |
| Correo de gobernanza | beyondnet.peru@gmail.com |

Para preguntas sobre un ADR o gap, abrir un GitHub Issue referenciando el número ADR/GT.

---

*Esta guía fue creada para cerrar GT-330 (mitigación de bus factor). Actualizar a medida que el código base evolucione.*
