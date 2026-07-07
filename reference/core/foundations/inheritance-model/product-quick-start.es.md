# Evolith Quick Start — Onboarding de Nuevos Productos en la Plataforma

**Rol:** Desarrollador / Arquitecto de Soluciones  
**Objetivo:** Aplicar la referencia arquitectónica de **Evolith** a un nuevo producto sin confundir política con una implementación de ejemplo.

## 1. Elegir el Punto de Partida Correcto

| Necesidad | Punto de partida |
|---|---|
| Definir la arquitectura de un nuevo producto | [Hub de Arquitectura](../../architecture/README.es.md) y [Guia de Herencia](./child-repository-inheritance-guide.es.md) |
| Revisar un ejemplo ejecutable completo | [Modelo Aplicado UMS](../../../../product/research/demo/ums-reference-model.es.md) |
| Ejecutar el ejemplo oficial | [README UMS](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Seleccionar un runtime | [Indice del Stack Tecnologico](../../architecture/blueprints/authoritative-tech-stack.es.md) |

**Evolith** es un upstream documental y de decisiones — no una plantilla de inicio. No se clona como starter de aplicación y no contiene un sandbox local de producto.

## 2. Aplicar la Referencia a un Producto

1. Leer el baseline agnostico y la matriz ADR.
2. Seleccionar el perfil de runtime justificado por el contexto del producto.
3. Crear documentacion propia del producto: vision, bounded contexts, glosario, restricciones y decisiones locales.
4. Registrar si cada ADR upstream aplicable se adopta, extiende, sobreescribe o no aplica.
5. Usar UMS como evidencia de implementacion para preocupaciones empresariales, no como copia automatica de cada seleccion tecnologica.

## 3. Revisar UMS

UMS es ahora la referencia aplicada oficial de producto porque demuestra preocupaciones ausentes en un ejemplo trivial: ciclo de vida de identidad, control de acceso, auditoria, bounded contexts, limites de protocolos API, persistencia, integracion frontend y documentacion operativa.

```bash
git clone https://github.com/beyondnetcode/ums.git
cd ums
```

Usa las [instrucciones vigentes de UMS](https://github.com/beyondnetcode/ums/blob/main/README.md) para prerrequisitos y ejecucion. Los comandos permanecen en UMS para que este upstream no publique setup de producto desactualizado.

## 4. Gates Documentales Obligatorios

Antes de contribuir cambios a este corpus de referencia, ejecuta:

```bash
node .harness/scripts/ci/01-validate-docs.mjs
```

Al agregar o cambiar diagramas Mermaid, ejecuta tambien:

```bash
node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid
```

## 5. Colaboración con Agentes de IA (BMAD Method)

Evolith Core utiliza el Método BMAD para orquestar agentes de IA especializados. Puedes invocarlos por su nombre específico en tu IDE o prompts para obtener soporte en diferentes fases del ciclo de vida:

- **Winston (Arquitecto Principal):** Invócalo para auditorías arquitectónicas profundas, chequeos de madurez del repositorio y actualización del tracking de GAPs.
- **Agente Arquitecto (Architect):** Invócalo para diseñar estructuras multi-topología (Data Mesh, Serverless, Edge), definir contratos OPA/Rego y redactar ADRs.
- **Agente Desarrollador (Developer):** Invócalo para implementar capas de Clean Architecture, patrones distribuidos (ej. Transactional Outbox) y componentes seguros.
- **Agente QA:** Invócalo para escribir tests automatizados, validar payloads de eventos entre dominios y aplicar mitigaciones de seguridad OWASP.
- **Agente DevOps:** Invócalo para configurar GitHub Actions, automatizar releases de documentación y orquestar despliegues distribuidos.
- **Agente Docs:** Invócalo para traducir archivos manteniendo la paridad bilingüe y validar estructuras markdown.

## 6. Asistencia

- [Registro ADR](../../architecture/adrs/README.es.md)
- [Taxonomia del Repositorio](../../control-center/taxonomy/repository-taxonomy.es.md)
- [Referencia vs Modelo Aplicado UMS](../../../../product/research/demo/demo-vs-reference.es.md)

---
[Volver a Onboarding](./README.es.md)
