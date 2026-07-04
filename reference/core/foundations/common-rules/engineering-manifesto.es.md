# Manifiesto de Ingeniería Evolith — Estándares Globales y Guías para Desarrolladores

> BMAD-METHOD se referencia aquí solo como método de entrega spec-driven AI-DD. No es el nombre, acrónimo ni manifiesto de este conjunto documental.

Este manifiesto define los estándares de ingeniería no negociables para cada equipo y producto construido sobre la plataforma de arquitectura **Evolith**. El cumplimiento es obligatorio; las desviaciones requieren un ADR con aprobación del Architecture Board.

## 1. Principios Core de Ingeniería (Obligatorios)
Todo código, wrappers y diseños arquitectónicos dentro del monorepo de referencia Evolith **DEBEN** adherirse estrictamente a los siguientes principios. Las revisiones de código rechazarán cualquier Pull Request que viole estos fundamentos:

* **SOLID**: Responsabilidad única, Abierto/Cerrado, Sustitución de Liskov, Segregación de Interfaces e Inversión de Dependencias.
* **DRY (Don't Repeat Yourself)**: Eliminar la duplicación innecesaria. Consolidar la lógica compartida en utilidades o librerías compartidas (shared-kernel).
* **KISS (Keep It Simple, Stupid)**: Evitar la sobre-ingeniería. Escribir código que sea fácil de leer, entender y depurar.
* **YAGNI (You Aren't Gonna Need It)**: No añadir funcionalidad, abstracciones o herramientas hasta que sean estrictamente necesarias.
* **SoC (Separation of Concerns)**: Mantener las capas completamente aisladas. Un controlador no debe escribir lógica de negocio; un caso de uso no debe ejecutar SQL puro.
* **Código Limpio y Arquitectura Limpia**: Proteger el dominio. Los Puertos (interfaces) y Adaptadores (implementaciones simples) son OBLIGATORIOS desde la Fase 1 para evitar acoplamiento técnico estructural. La complejidad adicional (wrappers) se difiere.
* **Seguro por Diseño & OWASP**: Validar todas las entradas (DTOs), sanear las salidas, imponer RBAC de forma nativa y prevenir inyecciones SQL/NoSQL por defecto.

---

## 2. Domain-Driven Design (DDD): Opcional y Pragmático
Aunque nuestra arquitectura soporta DDD táctico y estratégico:
**DDD es estrictamente OPCIONAL**.
Solo se utilizará cuando añada un valor tangible a un dominio de negocio complejo. **No** debe considerarse una camisa de fuerza obligatoria o restrictiva para la arquitectura. Para operaciones simples CRUD (Crear, Leer, Actualizar, Borrar), los Casos de Uso Hexagonales estándar y los Mapeadores de Datos son más que suficientes. La aplicación excesiva de DDD a entidades simples se considera un anti-patrón (Sobre-ingeniería).

---

## 3. « Anti-patrones Arquitectónicos y de Código (Estrictamente Prohibidos)
Para garantizar una alta mantenibilidad y una baja deuda técnica, se prohíben explícitamente las siguientes prácticas:
* **Alto Acoplamiento**: Dependencias directas en herramientas concretas de terceros dentro del Core. (Viola DIP).
* **Clases Dios / Módulos Mágicos**: Clases que manejan el enrutamiento, la validación, la lógica de negocio y el guardado en la base de datos simultáneamente.
* **Bloqueo de Proveedor sin Adaptadores**: Escribir a fuego (hardcoding) SDKs (ej. AWS SDK, Unleash, Redis) fuera de los Puertos/Adaptadores de Infraestructura aislados.
* **Código Espagueti e Infierno de Callbacks**: Falta de async/await estructurado o mónadas funcionales (como el Patrón Result).
* **Excepciones Ignoradas**: Capturar errores sin registrarlos adecuadamente o devolver genéricos 500s sin IDs de traza.

---

## 4. Puertos y Adaptadores: Qué es Esencial vs. Accidental
Para evitar deuda estructural técnica y garantizar que el núcleo de dominio nunca se contamine con detalles de frameworks o infraestructura, la arquitectura hexagonal no se "pospone", sino que se implementa de forma simplificada.

| Concepto | ¿Esencial o Accidental? | ¿Fase 1? | ¿Fase 2+? |
| :--- | :--- | :--- | :--- |
| **Puerto (Interfaz/Contrato)** | **Esencial** | **OBLIGATORIO** | Obligatorio |
| **Adaptador (Implementación directa)** | **Esencial** | **OBLIGATORIO, simple** | Puede evolucionar |
| **Wrapper anticorrupción complejo** | Accidental | Prohibido (posponer) | Permitido si hay integración externa |
| **Fachada / Capa adicional** | Accidental | Prohibido (posponer) | Permitido si es justificado por ADR |

> **Regla de Oro**: Un adaptador simple en Fase 1 es una sola clase que implementa el puerto y llama directamente a la librería (ej. TypeORM o Prisma), sin crear capas de abstracción intermedias redundantes.

---

## 5. Gobernanza Técnica y Mecanismos de Aplicación
La revisión humana es imperfecta. Confiamos en la **Aplicación Automatizada** para asegurar que estos principios sean sostenibles a lo largo del tiempo. BMAD-METHOD puede usarse como flujo spec-driven AI-DD para producir y validar artefactos, pero los estándares de ingeniería son independientes de ese método:

1. **Linters y Reglas Arquitectónicas**:
 * `eslint-plugin-boundaries` fallará automáticamente la construcción si un desarrollador importa una capa exterior (infraestructura) en una capa interior (core).
2. **Análisis Estático de Código**:
 * `eslint-plugin-sonarjs` se ejecuta localmente para detectar complejidad cognitiva, deuda cognitiva y olores de código (code smells) antes de que se cree un commit.
3. **Puertas de Calidad y Validaciones CI/CD**:
 * GitHub Actions bloqueará la fusión si las pruebas fallan o si la construcción se rompe.
4. **Pruebas Automatizadas y Umbrales de Cobertura**:
 * Las pruebas Unitarias y E2E son obligatorias. SonarQube/Jest impondrán un umbral duro de **>70% de Cobertura de Código**.
5. **Escaneo de Dependencias y Seguridad**:
 * Obligatorio `npm audit --audit-level=high` en las pipelines CI/CD para bloquear dependencias vulnerables. GitHub CodeQL se ejecuta de forma asíncrona para detectar vulnerabilidades OWASP.
6. **Cumplimiento de Estándares de Codificación**:
 * Prettier y ESLint se imponen a través de ganchos `pre-commit` de Husky. El código que no esté formateado correctamente no podrá ser commiteado.

---

## 6. Matriz de Prioridad de Decisión
Cada vez que se toma una decisión técnica (ej. escribir un nuevo ADR, elegir una librería o diseñar un módulo), el arquitecto y los desarrolladores deben priorizar los siguientes atributos, en orden:
1. **Mantenibilidad**
2. **Escalabilidad**
3. **Extensibilidad**
4. **Desacoplamiento**
5. **Observabilidad**
6. **Seguridad**
7. **Resiliencia**
8. **Testabilidad**
9. **Rendimiento**
10. **Claridad Arquitectónica**

---

## 7. Complejidad de Plataforma Progresiva
> [!IMPORTANT]
> **Canon de Evolución Progresiva**: La arquitectura evoluciona en complejidad incremental. La Fase 1 es deliberadamente simple y no exige tecnologías, patrones o procesos que excedan las necesidades de un monolito modular. Cada requisito adicional se introduce en la fase donde la arquitectura lo justifica objetivamente, no antes.

La infraestructura nunca debe sobrecargar los ciclos de desarrollo tempranos. La carga operativa debe escalar simétricamente con la madurez de la arquitectura, tal como define el [Reference Blueprint](../../../architecture/blueprints/reference-blueprint.es.md):
- **Fase 1 (Monolito Modular):** Despliegue ligero en contenedores estándar (OCI) sobre máquinas virtuales, App Services o Docker Compose. No se requiere clúster de orquestación.
- **Fase 2 (Módulos Desacoplables):** Instrumentación de telemetría y manifiestos listos para orquestación, manteniendo el despliegue simplificado.
- **Fase 3+ (Servicios Distribuidos):** Se activa obligatoriamente la orquestación mediante **Kubernetes** gestionado o autohospedado.
La preparación para escenarios físicamente desconectados (Air-Gapped) se garantiza mediante la abstracción de SDKs desde el inicio, pero su ejecución física avanza con la madurez del producto.

---

## 8. Checklist de Calidad de Pull Request
Antes de enviar un PR, los desarrolladores deben verificar:
- [] No se filtra lógica de capa externa en el Dominio.
- [] Los intereses transversales (Registro, Caché) usan Decoradores o Puertos (No hay lógica de herramientas a fuego en el core).
- [] DDD solo se utilizó si la complejidad del dominio lo justificaba; de lo contrario, se usó la Arquitectura Limpia estándar.
- [] La cobertura de pruebas para la nueva funcionalidad es >70%.
- [] `npm run lint` y `npm run test` locales pasan con éxito.

---
[Volver al Índice](./README.es.md)
