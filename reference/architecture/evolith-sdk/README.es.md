# Evolith SDK / CLI

## Resumen

El **Evolith SDK** (y su envoltura CLI) es la plataforma operativa oficial para la arquitectura Evolith. Va más allá de la simple creación de proyectos iniciales; está diseñado para ser un asistente arquitectónico vivo que opera localmente en entornos de desarrolladores, IDEs (vía MCP) y pipelines de agentes autónomos.

## Principios Arquitectónicos

1. **Convención sobre Configuración**: El CLI confía en los valores predeterminados de Evolith. Solicitará explícitamente solo lo estrictamente necesario y nunca sobrescribirá código existente sin confirmación explícita.
2. **Extensibilidad Modular**: La lógica está limpiamente separada en una capa `core` que contiene servicios de dominio (ADRs, Gobierno, Almacenamiento) y una capa envolvente externa (`commands`, `mcp`) que expone estas capacidades a diferentes consumidores.
3. **Consumo Omnicanal**: 
   - **CLI**: Uso directo por terminal (ej., `smart-cli adr create`).
   - **Servidor MCP**: Servidor local por I/O estándar para integración con IDEs (`smart-cli mcp serve`).
   - **Agentes**: Invocaciones automatizadas dentro de CI/CD o ciclos de agentes.

## Módulos Principales

El SDK se divide en seis pilares operativos principales:

1. **Módulo Init (`smart-cli init`)**: Inicializa un repositorio nuevo o existente, estableciendo la base documental bilingüe, el registro de ADRs y los *quality gates* necesarios para ser un Satélite Evolith oficial.
2. **Módulo ADR (`smart-cli adr`)**: Gestiona el ciclo de vida de los *Architecture Decision Records*, plantillas, validación y enlaces entre las decisiones del Satélite y los estándares Upstream.
3. **Límites de Arquitectura (`smart-cli architecture ask`)**: Una interfaz de búsqueda/RAG (usando un patrón de Inversión de Control para soportar tanto índices locales ligeros como búsquedas vectoriales empresariales) para responder preguntas arquitectónicas basadas en el corpus.
4. **Gobierno de Estándares (`smart-cli standards`)**: Evalúa las estructuras del repositorio contra los patrones definidos, sugiriendo refactorizaciones y asegurando el cumplimiento.
5. **Sincronización de Documentación (`smart-cli docs`)**: Asegura la sincronización de código a documentación, validación de paridad bilingüe y verificación de diagramas Mermaid.
6. **Integración IDE (`smart-cli mcp`)**: Expone las herramientas del SDK mediante el *Model Context Protocol* a asistentes como Antigravity.

## Navegación

- [Diseño Técnico y Arquitectura](./technical-design.es.md)
- [Modelo de Dominio y Mapas Conceptuales](./domain-model.es.md)
