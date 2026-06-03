# Licensing & Open Source Governance — Selección Responsable de Tecnologías de Cero Costo

> **Navegación bilingüe:** [English Version](./licensing-and-open-source-governance.md)
>
> **Clasificación Evolith:** Estándar obligatorio para selección tecnológica y gestión de dependencias
>
> **Propietario:** Evolith Architecture Board
>
> **Estado:** Referencia activa
>
> **Padre:** [Centro de Estándares Corporativos](../README.es.md)

---

## Propósito

Licensing & Open Source Governance define cómo los equipos Evolith deben evaluar, seleccionar y documentar tecnologías open source, free software, copyleft, Creative Commons, source-available y comerciales.

Evolith promueve una estrategia de **cero costo de desarrollo base**, pero cero costo no significa ausencia de obligaciones. Cada dependencia, herramienta, librería, plantilla, asset, dataset, modelo, documentación o componente externo debe tener una licencia identificada, compatible y aceptada por gobierno.

---

## Principio Rector

> Cero costo de licencia inicial no equivale a cero riesgo legal, operativo o comercial.

Evolith prioriza tecnologías sin costo inicial de licenciamiento cuando son técnicamente maduras, sostenibles y legalmente compatibles. Sin embargo, la selección debe considerar:

- Derecho de uso comercial.
- Derecho de modificación.
- Derecho de redistribución.
- Obligaciones de atribución.
- Obligación de publicar código fuente.
- Riesgo de copyleft directo o indirecto.
- Restricciones por red, SaaS o distribución.
- Patentes y garantías.
- Riesgo de cambio de licencia.
- Costo real de soporte, operación y mantenimiento.

---

## Taxonomía de Licenciamiento

| Categoría | Qué significa | Ejemplos comunes | Postura Evolith |
|---|---|---|---|
| Dominio público / dedicación pública | El autor renuncia o reduce derechos patrimoniales en la medida permitida | CC0, Unlicense | Permitido con revisión básica |
| Permisiva open source | Permite uso, modificación y redistribución con obligaciones ligeras | MIT, BSD, Apache-2.0, ISC | Preferida |
| Copyleft débil | Protege componentes específicos, usualmente permite integración con software propietario bajo condiciones | LGPL, MPL-2.0 | Permitida con revisión |
| Copyleft fuerte | Puede exigir que derivados distribuidos mantengan la misma licencia | GPL | Condicional; requiere ADR y revisión legal cuando hay distribución |
| Copyleft de red | Extiende obligaciones a uso por red o SaaS | AGPL | Restringida; requiere aprobación explícita |
| Creative Commons | Licencias para contenido, documentación, imágenes, textos o assets; no recomendadas para software | CC BY, CC BY-SA, CC BY-NC, CC BY-ND | Permitida solo para contenido; revisar restricciones |
| Source-available | Código visible, pero no necesariamente open source; puede restringir uso competitivo, comercial o producción | BSL/BUSL, SSPL-like, licencias propietarias con source access | Restringida; tratar como comercial |
| Freeware / gratis propietario | Sin costo, pero sin derechos amplios de modificación o redistribución | Herramientas gratuitas cerradas | Permitida solo como herramienta, no como dependencia core sin revisión |
| Comercial / propietario | Requiere contrato, suscripción, EULA o licencia pagada | SaaS, SDKs comerciales, componentes enterprise | Permitida por excepción de negocio |
| Sin licencia declarada | No hay permiso explícito de reutilización | Repositorios públicos sin LICENSE | Prohibida para reutilización |

---

## Diferencias Clave

| Concepto | Enfoque | Aclaración Evolith |
|---|---|---|
| Open source | Cumple criterios de acceso a código, modificación, redistribución y no discriminación | No basta con que el código esté visible |
| Free software | Enfatiza libertades del usuario: ejecutar, estudiar, modificar y redistribuir | Libre no significa necesariamente gratis |
| Copyleft | Obliga a preservar libertades en redistribuciones o derivados | Puede afectar arquitectura, distribución y estrategia comercial |
| Creative Commons | Diseñado principalmente para contenido creativo y documentación | No usar como licencia de software salvo evaluación formal |
| Comercial | Define derechos por contrato, EULA o suscripción | Puede ser válido, pero rompe la promesa de cero costo base si es obligatorio |
| Source-available | Código accesible, pero con restricciones | No clasificar automáticamente como open source |

---

## Matriz de Decisión Evolith

| Necesidad | Recomendación por defecto | Evitar salvo aprobación |
|---|---|---|
| Librería runtime en backend o frontend | MIT, Apache-2.0, BSD, ISC | GPL, AGPL, licencia custom, sin licencia |
| Framework principal de aplicación | MIT, Apache-2.0, BSD | Source-available restrictivo, comercial obligatorio |
| Base de datos o infraestructura local | Apache-2.0, PostgreSQL-like, permissive OSS | SSPL-like, AGPL sin revisión, SaaS obligatorio |
| Herramienta de desarrollo local | OSS permisiva o gratuita con EULA aceptable | Herramientas que impidan CI/CD reproducible |
| Documentación Evolith | Licencia propia del repositorio o Creative Commons compatible | CC-NC/ND si se requiere reutilización o adaptación empresarial |
| Imágenes, íconos, música, assets | CC BY, CC0, licencia comercial clara | Sin licencia, NC, ND, assets generados sin derecho claro de uso |
| Plantillas, prompts y material de capacitación | Licencia documental clara con atribución | Material copiado sin fuente o permiso |
| Modelos IA, datasets o embeddings | Licencia explícita y compatible con uso comercial | Licencia ausente, research-only, non-commercial, dataset sin provenance |
| Componente core de producto | Licencia permisiva o comercial aprobada | Copyleft fuerte sin estrategia de distribución |

---

## Política de Preferencia

### Preferido

Usar por defecto cuando cumpla madurez técnica, seguridad y compatibilidad:

- MIT.
- Apache-2.0.
- BSD-2-Clause / BSD-3-Clause.
- ISC.
- PostgreSQL License.
- CC0 para assets o contenido donde aplique.
- CC BY para contenido con atribución clara.

### Permitido con Revisión

Puede usarse si se documentan obligaciones y compatibilidad:

- MPL-2.0.
- LGPL.
- EPL.
- CC BY-SA.
- Herramientas freeware no críticas.
- Servicios comerciales opcionales y reemplazables.

### Restringido

Requiere ADR, revisión legal o aprobación del Architecture Board:

- GPL en componentes distribuidos.
- AGPL en sistemas web, SaaS o servicios expuestos por red.
- Licencias source-available.
- Licencias con cláusulas non-commercial.
- Licencias con cláusulas no-derivatives.
- Licencias custom.
- Dependencias sin SPDX reconocido.
- Componentes con cambio reciente de licencia.

### Prohibido por Defecto

No debe usarse salvo autorización excepcional:

- Código sin licencia declarada.
- Copia de código desde blogs, gists o respuestas sin licencia.
- Assets sin fuente o licencia verificable.
- Licencias que prohíban uso comercial si el producto puede tener explotación empresarial.
- Licencias que impidan modificar, auditar, desplegar o operar el sistema.

---

## Regla de Cero Costo de Desarrollo

La estrategia Evolith de cero costo de desarrollo significa:

| Dimensión | Regla |
|---|---|
| Desarrollo inicial | Preferir tecnologías sin costo de licencia para construir, probar y desplegar localmente |
| Dependencias core | Preferir OSS permisivo con comunidad madura |
| Herramientas enterprise | Deben ser opcionales, reemplazables o justificadas por ROI |
| SaaS externo | No debe ser obligatorio para ejecutar el producto base salvo ADR |
| Licencias comerciales | Deben aprobarse explícitamente como excepción de negocio |
| Costo oculto | Debe evaluarse soporte, operación, lock-in, seguridad y compliance |

La promesa no significa que todo deba ser gratis. Significa que el producto base debe poder construirse y evolucionar sin quedar bloqueado por licencias pagadas, proveedores cerrados o restricciones incompatibles con uso empresarial.

---

## Checklist Obligatorio de Selección

Antes de incorporar una tecnología, el responsable técnico debe responder:

- ¿Cuál es la licencia exacta y su identificador SPDX?
- ¿Permite uso comercial?
- ¿Permite modificación?
- ¿Permite redistribución?
- ¿Exige atribución o conservación de notices?
- ¿Exige publicar código fuente propio o derivado?
- ¿La obligación se activa por distribución, linking, modificación o uso por red?
- ¿Es compatible con la licencia del repositorio producto?
- ¿La licencia aplica a código, documentación, assets, datasets o modelo IA?
- ¿Existe riesgo de patentes?
- ¿Existe riesgo de cambio de licencia o dual licensing?
- ¿Hay alternativa permisiva madura?
- ¿Se puede reemplazar sin reescribir el core?
- ¿La dependencia está registrada en el inventario SBOM?

---

## Clasificación Operativa de Riesgo

| Nivel | Descripción | Acción requerida |
|---|---|---|
| Bajo | Licencia permisiva conocida, uso estándar, comunidad madura | Registrar en inventario |
| Medio | Copyleft débil, licencia documental, freeware o asset externo | Revisión técnica y evidencia de obligaciones |
| Alto | Copyleft fuerte, source-available, commercial EULA, dataset/modelo IA | ADR y revisión Architecture Board |
| Crítico | Sin licencia, NC/ND incompatible, AGPL en SaaS, licencia custom ambigua | Bloquear hasta revisión legal o reemplazo |

---

## Obligaciones de Cumplimiento

Todo producto heredero de Evolith debe mantener:

- Archivo `LICENSE` del repositorio.
- Inventario de dependencias y licencias.
- Notices y atribuciones requeridas.
- SBOM cuando aplique a release empresarial.
- Evidencia de revisión para licencias restringidas.
- ADR para decisiones de licenciamiento que afecten arquitectura, distribución, SaaS, monetización o propiedad intelectual.
- Registro de excepciones aprobadas.

---

## Relación con Artefactos SDLC

| Artefacto | Uso esperado |
|---|---|
| PRD | Declarar restricciones de costo, comercialización, distribución y uso empresarial |
| ADR | Justificar licencias restringidas, comerciales, copyleft o source-available |
| Historia Técnica | Registrar dependencias nuevas, licencia y obligaciones |
| Test Summary Report | Evidenciar que los escaneos de dependencias/licencias pasaron |
| Release Notes | Declarar cambios relevantes en dependencias, licencias o notices |
| SBOM / Inventario | Mantener evidencia de componentes usados y sus licencias |

---

## Reglas para Creative Commons

Creative Commons debe usarse principalmente para contenido, no para software.

| Licencia CC | Uso recomendado | Riesgo |
|---|---|---|
| CC0 | Assets o contenido que puede reutilizarse sin atribución | Bajo |
| CC BY | Documentación, imágenes o contenido con atribución | Bajo |
| CC BY-SA | Contenido que puede requerir compartir derivados bajo la misma licencia | Medio |
| CC BY-NC | Restringe uso comercial | Alto para productos empresariales |
| CC BY-ND | Restringe obras derivadas | Alto si se requiere adaptar |
| CC BY-NC-ND | Muy restrictiva | Evitar en productos Evolith |

---

## Decisión Evolith

Evolith adopta una postura pragmática: maximizar cero costo de desarrollo base sin sacrificar seguridad jurídica, trazabilidad, propiedad intelectual ni viabilidad comercial.

La selección tecnológica debe favorecer licencias permisivas y sostenibles. Las licencias copyleft, source-available, Creative Commons restrictivas y comerciales pueden ser válidas en contextos específicos, pero requieren gobierno explícito antes de convertirse en dependencia relevante del producto.

---

## Referencias Externas

- Open Source Initiative — Open Source Definition.
- Free Software Foundation — Free Software Definition.
- Creative Commons — Licensing Considerations.
- SPDX — License List.

---

[Volver al Índice de Ingeniería](./README.md)
