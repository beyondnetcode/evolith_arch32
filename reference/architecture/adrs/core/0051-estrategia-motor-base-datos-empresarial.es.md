# [ADR 0051](0051-estrategia-motor-base-datos-empresarial.md): Estrategia de Selección de Motores de Base de Datos Empresarial

## 1. Metadatos
* **ADR ID:** 0051
* **Título:** Estrategia de Selección de Motores de Base de Datos Empresarial
* **Estado:** Aprobado
* **Autores:** Oficina de Arquitectura Empresarial
* **Revisores:** Comité de Arquitectura Corporativa, Oficina del CTO
* **Fecha:** 2026-05-14
* **Tags:** `Gobierno`, `Persistencia`, `Base de Datos`, `Estándares`
* **ADRs Relacionados:** 
 * [ADR-0044: Estrategia de Persistencia de Seguridad Configurable](./0044-configurable-security-persistence-strategy.md)
 * [ADR-0047: Evolución de Patrones Arquitectónicos](./0047-architectural-patterns-monolith-soa-microservices.md)

---

## Resumen Ejecutivo
A medida que el ecosistema madura hacia una malla políglota, la estandarización de la capa de persistencia se vuelve crítica para la eficiencia operativa, la optimización del rendimiento y la alineación con el soporte de proveedores. Este ADR establece las preferencias obligatorias de motores de base de datos según el entorno de ejecución para maximizar la sinergia entre el framework de aplicación y el almacenamiento de datos.

---

## 2. Contexto del Problema
Históricamente, el ecosistema se inclinó hacia PostgreSQL como un estándar universal por defecto. Si bien PostgreSQL es altamente versátil, ciertos entornos de ejecución logran un mejor rendimiento, experiencia de desarrollador e integración empresarial cuando se combinan con sus contrapartes "naturales" del ecosistema. Específicamente, las aplicaciones .NET se benefician significativamente de la integración profunda con SQL Server, mientras que los entornos Node.js están altamente optimizados para PostgreSQL y MongoDB.

---

## 3. Decisión
El estándar empresarial para motores de base de datos ahora se diferencia por el entorno de ejecución y los requisitos del modelo de datos:

### 3.1 Runtime .NET / C#
* **Motor Obligatorio:** **Microsoft SQL Server (Última Versión Estable)**
* **Racional:** Integración nativa con Entity Framework Core, rendimiento superior para cargas de trabajo empresariales y herramientas de gestión avanzadas (SSMS, SQL Profiler).
* **Restricción:** Todos los nuevos servicios .NET DEBEN utilizar SQL Server a menos que se otorgue una exención técnica específica.

### 3.2 Runtime Node.js / TypeScript (Relacional)
* **Motor Obligatorio:** **PostgreSQL (v16+)**
* **Racional:** Estándar de la industria para arquitecturas Node.js de código abierto, excelente soporte en TypeORM/Drizzle y robusto soporte de JSONB para modelos híbridos.

### 3.3 Runtime Node.js / TypeScript (No Relacional)
* **Motor Obligatorio:** **MongoDB**
* **Racional:** Preferido para almacenamiento orientado a documentos, prototipado rápido y datos no estructurados de alta velocidad dentro del ecosistema Node.js.

---

## 4. Impulsores Arquitectónicos
1. **Optimización del Rendimiento:** Utilización de los drivers y características del motor más optimizados para cada runtime.
2. **Experiencia del Desarrollador (DX):** Alineación con los stacks más comunes y mejor documentados en cada comunidad.
3. **Eficiencia Operativa:** Estandarización en motores de alta madurez para simplificar el mantenimiento por parte de DBA y DevOps.
4. **Soporte de Proveedores:** Aprovechamiento del soporte empresarial profundo para SQL Server en entornos corporativos.

---

## 5. Guías de Implementación

### 5.1 Ruta de Migración
* **Nuevos Proyectos:** DEBEN seguir esta estrategia desde su inicio.
* **Proyectos Existentes:** Deben evaluar la migración durante su próximo ciclo de refactorización mayor si actualmente están desalineados con estos estándares.
* **Sistemas Satélite:** Todos los sistemas que hereden de la Arquitectura de Referencia DEBEN adoptar estos motores para garantizar la compatibilidad con las plantillas de infraestructura corporativa.

### 5.2 Infraestructura
* Las plantillas corporativas de `docker-compose` y los manifiestos de K8s proporcionarán imágenes estándar para SQL Server, PostgreSQL y MongoDB.

---

## 6. Consecuencias

### Positivas:
* **Mayor Rendimiento:** Mejor utilización de pools de conexiones y características específicas del runtime.
* **Reducción de Fricción:** Los desarrolladores utilizan herramientas con las que están más familiarizados en sus respectivos ecosistemas.
* **Mejora de la Observabilidad:** Mejor integración con herramientas de monitoreo específicas del runtime (ej. SQL Server Extended Events).

### Negativas:
* **Mayor Diversidad de Infraestructura:** DevOps debe soportar tres motores de base de datos distintos en lugar de uno.
* **Requisito de DBA Políglota:** Requiere conocimientos tanto de T-SQL como de PL/pgSQL dentro de la organización.

---

## Conclusión Estratégica
Al alinear nuestra estrategia de persistencia con las fortalezas de cada runtime, aseguramos que nuestros sistemas se construyan sobre las bases más estables y eficientes disponibles. SQL Server para .NET y PostgreSQL/MongoDB para Node.js representan las mejores prácticas de la industria para arquitecturas políglotas de grado empresarial.

---
[Volver al Índice](../../../../MASTER_INDEX.es.md)
