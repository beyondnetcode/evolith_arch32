# ADR-AI-002: MCP as standard protocol for agent-service integration


---

## Context
Como los agentes de IA deben interactuar con los servicios de inventario, facturación y logística de la empresa, surge la necesidad de definir una interfaz común. Sin un estándar, cada equipo de producto implementa su propio pegamento patentado (envoltorios personalizados) para exponer los puntos finales REST a sus agentes, lo que dificulta la reutilización entre departamentos y la auditoría centralizada.
## Decision
El **Protocolo de contexto modelo (MCP)** está aprobado como la capa de integración estandarizada para conectar servicios backend con cualquier agente autónomo o entorno de desarrollo mejorado con IA. Los dominios que deseen "servir" datos a agentes corporativos DEBEN construir y exponer un **Servidor MCP**.
## Alternatives Considered
* **RESTO directo + RAG dinámico:** Requiere código manual para cada conector y adolece de la falta de un catálogo de herramientas estandarizado y tipificado para los modelos.
* **SDK propietario del proveedor:** (por ejemplo, solo se utilizan complementos de Semantic Kernel). Nos bloquea en una pila específica y limita el uso de herramientas IDE agentes modernas (como Claude o Cursor) que son MCP-First.
* **gRPC para llamadas de herramientas:** Demasiado pesado para los orquestadores agentes basados ​​en JSON y carece del ecosistema de host MCP maduro.
## Consequences and Trade-offs
* **Interoperabilidad directa:** El mismo servidor MCP sirve simultáneamente para potenciar tanto el IDE del desarrollador como el Agente CRM.
* **Seguridad unificada:** Facilita la creación de Gateways que auditen las llamadas a herramientas en un único formato universal.
* **Compensación:** Exige agregar un contenedor de transporte (Stdio o SSE) a los microservicios que tradicionalmente eran solo REST/gRPC.
## References
* Especificación oficial de MCP: https://modelcontextprotocol.io

---
[Volver al índice](./README.md)