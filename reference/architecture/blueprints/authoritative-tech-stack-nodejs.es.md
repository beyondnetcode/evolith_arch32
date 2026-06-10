# Stack Tecnológico Autorizado: Ecosistema Node.js & TypeScript

> **Navegación Bilingüe:** [English Version](./authoritative-tech-stack-nodejs.es.md)

**Tipo de Documento:** Apéndice de Runtime 
**Prerrequisito:** DEBE leerse después de la **[Línea Base Agnóstica](./authoritative-tech-stack-agnostic.es.md)**. 

---

## 1. Matriz de Cumplimiento Ejecutiva (Mandatos para Proveedores)

| Categoría | Herramienta / Framework Aprobado | Versión Validada | ¿ADR Requerido para Cambiar? | Alternativas Explícitamente Rechazadas |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **Node.js (LTS)** | 20.x | **Sí** | Bun, Deno (hasta próxima auditoría) |
| **Host Web** | **NestJS (Motor Express)** | 10.x+ | **Sí** | Fastify (requiere ADR aprobado), Express Puro |
| **BD Relacional** | **PostgreSQL** | v16+ | **SÍ** | MySQL, MariaDB |
| **BD No Relacional** | **MongoDB** | Última | **SÍ** | Cassandra, DynamoDB |
| **ORM Relacional** | **TypeORM** o **Drizzle** | Última | **NO** | Sequelize, Prisma (requiere ADR de rendimiento) |
| **Validación** | **class-validator** | última | **NO** | Zod (excepto para contratos de API externos) |
| **Motor de Pruebas** | **Jest** | 29.x | **Sí** | Mocha, Ava |
| **Orquestador Monorepo**| **Nx** | 18.x+ | **Sí** | Turborepo, Lerna |
> [!TIP]
> **Aislamiento de Pruebas:** Los desarrolladores DEBEN seguir la estrategia de aislamiento definida en el [ADR-0052](../adrs/core/0052-unit-testing-isolation-strategy.es.md) al utilizar Mocks (verificación de interacción) o Stubs (configuración de estado).

>
> **Pruebas de Infraestructura:** Las pruebas de Integración y E2E DEBEN utilizar **Testcontainers** como se define en el [ADR-0053](../adrs/core/0053-integration-e2e-testing-strategy.es.md) para garantizar la paridad con producción.


---

## 2. Organización Arquitectónica (Espacio de Trabajo Nx)

Las soluciones Node.js DEBEN utilizar aislamiento estricto de librerías impuesto mediante **tags de Nx**:
1. **`type:domain`**: Cero importaciones externas. Objetos TS puros.
2. **`type:application`**: Contiene lógica agnóstica a NestJS, manejadores de comandos puramente por inyección de dependencias.
3. **`type:infrastructure`**: Contiene módulos concretos de NestJS, entidades ORM y adaptadores.
4. **`type:api`**: Cascarón de la aplicación NestJS de punto de entrada.

---

## 3. Herramientas de Runtime Específicas

* **Compilador:** `@swc/core` para compilación 20 veces más rápida en CI/CD.
* **Linting:** ESLint v8 modo estricto + configuración de Prettier.

---
-> Volver al **[índice Maestro Global](../../../MASTER_INDEX.es.md)**

---
[Volver al Índice](./README.md)
