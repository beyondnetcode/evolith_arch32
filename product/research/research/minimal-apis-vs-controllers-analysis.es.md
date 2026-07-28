# Evaluación arquitectónica: Minimal APIs frente a controladores MVC en .NET 8/9

## 1. Resumen ejecutivo

El ecosistema .NET (.NET 8+) ha consolidado las **Minimal APIs** no como una herramienta simplista de prototipado, sino como la **base canónica y de alto rendimiento** para las arquitecturas modernas orientadas a la nube. Aunque los controladores siguen soportados por compatibilidad hacia atrás, las Minimal APIs son técnicamente superiores para las nuevas cargas de trabajo empresariales, en particular las que apuntan a Native AOT, Serverless y microservicios.

---

## 2. Comparación de dimensiones técnicas

| Dimensión | Minimal APIs | Controladores MVC | Impacto arquitectónico |
| :--- | :--- | :--- | :--- |
| **Compatibilidad con Native AOT** | Totalmente lista para Native AOT. Usa generadores de código fuente. | Incompatible / exige trucos pesados de trimming sobre reflexión. | Descalifica a los controladores para Kubernetes de alta densidad y Serverless. |
| **Rendimiento y memoria** | Extremadamente ligeras. Tabla de rutas directa. | Sobrecosto alto por la instanciación del controlador, los filtros y el model binding. | Las Minimal APIs ahorran entre 15 % y 30 % de sobrecosto bajo carga alta. |
| **Tiempo de arranque (arranque en frío)** | Menos de 100 ms (reflexión casi nula). | Mayor, por el escaneo de ensamblados en busca de controladores. | Imprescindible para el escalado serverless. |
| **Seguridad** | Integración natural con la autenticación y los endpoints de ASP.NET Core. | Exige el ciclo de vida de filtros propio de MVC. | Las Minimal APIs son más simples, pero requieren reglas globales basadas en middleware. |
| **Observabilidad** | Totalmente integradas con OpenTelemetry y la Activity API. | Totalmente integrados. | Paridad. |
| **Versionado** | Soportado mediante `Microsoft.AspNetCore.OpenApi` / `Asp.Versioning.Http`. | Enrutamiento nativo por atributos. | Paridad, aunque la sintaxis difiere. |

---

## 3. Impacto sobre los paradigmas arquitectónicos

### Clean Architecture y DDD
- **Minimal APIs**: se mapean directamente a los handlers de aplicación (CQRS/MediatR) mediante métodos de extensión. Actúan como adaptadores de entrega puramente de infraestructura.
- **Controladores**: suelen atraer constructores sobrecargados y métodos auxiliares, lo que deriva en violaciones del principio de responsabilidad única (SRP).

### Vertical Slice Architecture
- **Minimal APIs**: sobresalen. Un solo archivo puede contener la definición del endpoint, los DTO y el enrutamiento del comando o la consulta.
- **Controladores**: fuerzan una separación a nivel de carpetas (Controllers frente a Models frente a Handlers), lo que dificulta encapsular una funcionalidad completa.

### Monolitos modulares y escala multiequipo
- **Riesgo**: sin una gobernanza estricta, `Program.cs` se convierte en un antipatrón enorme.
- **Mitigación**: adoptar un estándar de "Endpoint Mapping" (por ejemplo, extensiones de `IEndpointRouteBuilder` o bibliotecas como **FastEndpoints**) para separar las fronteras por módulo.

---

## 4. Escenarios de gobernanza empresarial

### Dónde aportan más valor las Minimal APIs
1. **Aplicaciones cloud-native y en contenedores**: despliegues a gran escala que exigen arranques en frío rápidos y una huella de memoria mínima.
2. **Implementaciones de CQRS y MediatR**: correspondencia directa uno a uno entre endpoint y request.
3. **Microservicios y BFF (Backend-for-Frontend)**: bases de código pequeñas, enfocadas y de evolución rápida.

### Dónde los controladores siguen siendo tolerables
1. **Migración de legado (brownfield)**: dependencia fuerte de filtros de acción y lógica de binding personalizados del ASP.NET MVC heredado.
2. **Integraciones con vistas MVC extensas**: mezcla de endpoints de API con vistas Razor tradicionales del lado del servidor (no Blazor).

---

## 5. Impacto operativo y organizativo
- **Experiencia de desarrollo (DX)**: la curva de aprendizaje inicial es más pronunciada para los equipos habituados a estructuras de carpetas rígidas. Una vez adoptada, acelera la revisión de pull requests porque los cambios quedan localizados (vertical slices).
- **Pruebas**: `WebApplicationFactory` ofrece pruebas de integración superiores para las Minimal APIs, porque permite sustituir servicios por dobles en la raíz con facilidad.

---

## 6. Recomendación estratégica

**Recomendación: estrategia de Minimal APIs estructuradas**
No conviene construir Minimal APIs "desnudas" directamente en `Program.cs`. Hay que imponer una capa de abstracción (`ICarter`, extensiones estándar de `MapGroup` o **FastEndpoints**) para garantizar la mantenibilidad, la integración automática con Swagger y una separación limpia de responsabilidades, sin volver al pipeline heredado de MVC.

---
[Volver al índice](./README.md)
