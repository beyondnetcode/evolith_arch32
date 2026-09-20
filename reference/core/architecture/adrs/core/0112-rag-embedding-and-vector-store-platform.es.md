> **Bilingual Navigation:** [View English version](./0112-rag-embedding-and-vector-store-platform.md)

# ADR-0112: Plataforma de Embeddings y Vector Store para RAG (Qwen3-Embedding sobre pgvector)

## Estado
Accepted

## Fecha
2026-07-13

## Contexto y Problema
El [ADR-0090](./0090-rag-knowledge-governance.es.md) estableció el **contrato** de gobernanza RAG — fragmentación, esquema de metadatos, reglas de embedding, disparador de sync — pero dejó a propósito dos cosas sin especificar: el **modelo de embedding** concreto (§3, "agnóstico al modelo") y el **proveedor de almacén vectorial** concreto (§5, "agnosticismo del vector store"). El [ADR-0003](../ai-augmented/0003-model-selection-governance.es.md) gobierna *cómo* se seleccionan los modelos (registro, política, telemetría) pero nunca fijó *qué* modelo de embedding usa Evolith.

La consecuencia es un andamiaje con una ranura de integración vacía. `.harness/scripts/ci/rag-port.mjs` solo trae un adaptador `memory` no durable cuyo `embed()` es un pseudo-embedding sha256 (`hashEmbed`); `registerRagAdapter()` está definido pero nunca se llama con un proveedor real; y el read-side de runtime (`InMemoryKnowledgeAdapter`) puntúa por coincidencia substring/tokens sin embeddings. Nada es operativo — que es exactamente lo que existe para cerrar en los gaps [`GT-538`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-538) (vector store durable), [`GT-539`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-539) (modelo de embedding real) y [`GT-540`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-540) (adaptador de retrieval de producción).

Cablear esos tres gaps requiere una decisión concreta de plataforma. Tomarla **una vez, aquí** evita cablear el vector store, el modelo de embedding y el read-side contra tres elecciones provisionales distintas y luego re-embeber el corpus para reconciliarlas.

La decisión está acotada por un principio de primer orden repetido en toda la arquitectura: **ninguna herramienta externa es jamás dependencia del Core**. La soberanía ([ADR-0088](./0088-sovereign-identity-agentic-ai.es.md)), la gobernanza de egress ([ADR-0001](../ai-augmented/0001-harness-engineering.es.md)) y el self-hosting son la postura por defecto — el ADR-0090 §5 ya nombra pgvector como target "self-hosted preferido". Un proveedor de embeddings gestionado (Voyage AI, OpenAI) sacaría el corpus del perímetro e introduciría una dependencia externa de pago, en contra de esa postura.

## Decisión
Fijamos la plataforma RAG como **totalmente open-source y self-hosted**. Este ADR selecciona la plataforma concreta; el ADR-0090 sigue siendo el contrato gobernante y el puerto permanece agnóstico al modelo (la elección de abajo es el *default*, no un lock-in).

### 1. Modelo de embedding — Qwen3-Embedding (Apache-2.0)
El modelo de embedding por defecto es **`Qwen3-Embedding-0.6B`** para un footprint self-hosted ligero, con **`Qwen3-Embedding-4B` / `-8B`** como escalado de máxima calidad.

Justificación:
- **Mejor calidad de retrieval abierto.** Qwen3-Embedding encabeza el leaderboard MTEB multilingüe (8B ≈ 70.58), superando a `text-embedding-3` de OpenAI por ~+6 puntos — el punto en que el retrieval open-weight adelantó a las APIs gestionadas.
- **Máximamente abierto.** Licencia Apache-2.0 (permisiva, segura para uso comercial) — satisface "el más abierto **y** el más rankeado" a la vez, algo que ni las opciones plenamente reproducibles-pero-menos-rankeadas (nomic) ni el workhorse MIT hybrid (BGE-M3) logran ambas.
- **Encaja con nuestro corpus.** 100+ lenguajes naturales **y** de programación — nuestro corpus son ADRs/rulesets en inglés con fences de código embebido, que este modelo maneja nativamente.
- **Footprint ajustable.** Dimensiones Matryoshka 32–1024, así que almacenamiento/latencia se pueden intercambiar por recall por despliegue sin cambiar de modelo.

El modelo seleccionado DEBE registrarse en el `model-registry.json` del ADR-0003 con capacidad `embedding`, y su identificador DEBE quedar en la metadata `corpus_version` de cada chunk según ADR-0090 §3 (para invalidación de caché y reconstrucción exacta).

### 2. Dimensión de embedding — 1024 (Matryoshka)
Dimensión de salida por defecto **1024** (máximo Matryoshka de Qwen3). La columna pgvector es `vector(1024)`. Una dimensión Matryoshka menor (p. ej. 512 / 256) PUEDE seleccionarse por despliegue por almacenamiento/latencia; la dimensión elegida es parte de la identidad del corpus y DEBE declararse en `corpus_version`.

### 3. Vector store — pgvector sobre el PostgreSQL existente
El vector store es **pgvector** sobre la instancia PostgreSQL que Evolith ya corre (`:5432`) — el target self-hosted preferido del ADR-0090 §5. Usar un índice **HNSW** para búsqueda ANN, con columnas de metadata para los campos de filtrado del ADR-0090 §2 (`source_file`, `adr_id`, `language`, `corpus_version`). Este es el adaptador durable que cablea `registerRagAdapter('pgvector', …)` (GT-538).

### 4. Runtime — host Node.js + sidecar de inferencia local
El modelo corre detrás de un **servicio de inferencia local en el mismo perímetro** (ONNX Runtime, `text-embeddings-inference` / `llama.cpp`, u Ollama) que los adaptadores Node `rag-port.mjs` (write-side) e `IKnowledgePort` (read-side) llaman por localhost. **Node no corre el modelo en proceso**; el sidecar es la frontera de plataforma. Los embeddings se computan en el perímetro — **no hay egress del corpus**.

### 5. Write-side vs query-side
- **Write-side (ingesta):** el re-embed delta en commits a `reference/` (ADR-0090 §4) es offline/batch — calidad primero; correr `4B`/`8B` donde el hardware lo permita.
- **Query-side (retrieval, GT-540):** sensible a latencia; `0.6B` basta dado el corpus pequeño. El query-side **DEBE** usar el mismo modelo y dimensión que el write-side, o los vectores no son comparables.

### 6. Modo de corpus solo léxico (enmendado 2026-09-19, GT-685)
Un despliegue PUEDE albergar el corpus **sin vectores densos**. En modo solo léxico cada chunk se almacena con `embedding = NULL` y se recupera a través del índice `content_tsv` (BM25, [GT-592](../../../control-center/gaps/gap-reference-catalog.es.md#gt-592)); el `corpus_version` lleva el sufijo `+lexical` en la misma ranura que ocuparía un id de modelo, porque «sin modelo» también es una identidad de corpus. Reglas:

- **El almacén responde con lo que tiene.** El lado de lectura es BM25-primero por construcción: el índice léxico siempre está conectado; el reordenador denso se conecta solo cuando hay un sidecar configurado **y** solo ordena filas con `embedding IS NOT NULL`. Un lector denso sobre un almacén solo léxico degrada a léxico y lo reporta en la traza de recuperación.
- **Una sincronización en vivo es densa o explícitamente léxica.** El lado de escritura acepta `EVOLITH_RAG_MODE=lexical` (sin embedder, vectores `NULL`) o un sidecar configurado (`EVOLITH_RAG_EMBED_URL`); el pseudo-embedding sha256 determinista sigue siendo un sustituto para pruebas y ensayos en seco, y una ejecución en vivo que fuera a persistirlo se rechaza por su nombre. Un índice léxico y uno denso nunca mezclan formas: el escritor léxico rechaza un vector, el denso rechaza `NULL`.
- **El reordenado denso es una mejora, no un requisito.** Añadir vectores es un reindexado (`+lexical` → `+<modelo>@<dim>`), el mismo disparador de reindexado completo que §5 ya define para un cambio de modelo.

Por qué esta enmienda: medido el 2026-09-19, el corpus EN son 5 698 chunks / 1,35 M tokens; las imágenes CPU de `text-embeddings-inference` son solo amd64 y un sidecar CPU (Ollama, arm64) embebió 10 chunks en 413 s, así que sembrar el índice denso en el hardware donde la gente desarrolla cuesta decenas de horas de CPU. El «sin egreso del corpus» de §4 descarta una API de embeddings alojada. La tool que anuncia la pasarela (`evolith-knowledge-search`) estaba por tanto registrada en todos los despliegues y no respondía en ninguno; un índice solo léxico la hace respondible donde corra un PostgreSQL, y sobre un corpus cargado de identificadores BM25 es la mitad que aporta el recall ([GT-592](../../../control-center/gaps/gap-reference-catalog.es.md#gt-592) lo midió).

## Alternativas Consideradas
| Opción | Licencia | Veredicto |
|---|---|---|
| **BGE-M3** | MIT | Adaptador alternativo documentado. Hybrid dense + sparse + multi-vector en un solo modelo, contexto de 8192 tokens, workhorse probado para pgvector self-hosted. Elegirlo cuando se quiere retrieval hybrid (dense+sparse); ligeramente por debajo de Qwen3 en MTEB dense puro. |
| **nomic-embed-text-v2** | Apache-2.0 (+ datos de entrenamiento abiertos) | Adaptador alternativo documentado. La opción "más reproducible" (pesos **y** datos abiertos) y la más rápida/de menor memoria; rankea por debajo de Qwen3. Elegirlo por reproducibilidad máxima o query-side de latencia ultra-baja. |
| **Voyage AI (`voyage-3.5`)** | Propietaria (gestionada) | Rechazada como default. Partner de embeddings recomendado por Anthropic y de alta calidad, pero **dependencia externa de pago con egress del corpus** — en contra del principio de soberanía / ninguna dependencia externa del Core. Permanece como adaptador opt-in válido detrás del puerto agnóstico al modelo. |
| **OpenAI (`text-embedding-3-small/large`)** | Propietaria (gestionada) | Rechazada como default. Ubicuo y barato, y citado ilustrativamente en el ADR-0003, pero mete una dependencia de OpenAI en un stack Anthropic-céntrico **y** egresa el corpus. Solo adaptador opt-in válido. |

## Consecuencias

### Positivas
- **Totalmente OSS, cero coste por token, cero egress del corpus** — soberano por construcción ([ADR-0088](./0088-sovereign-identity-agentic-ai.es.md), [ADR-0001](../ai-augmented/0001-harness-engineering.es.md)).
- **Calidad de retrieval abierto de primer nivel** sin proveedor gestionado.
- **Neutralidad de proveedor preservada** — el puerto agnóstico al modelo del ADR-0090 §3 queda intacto; cambiar modelo o dimensión es un re-embed, no un cambio de código.
- **Desbloquea GT-538 / GT-539 / GT-540** con una única plataforma coherente, evitando el doble cableado.

### Negativas
- **Carga operativa** de hospedar un sidecar de inferencia (GPU opcional para `0.6B`; `4B`/`8B` se benefician de GPU). Nuevo artefacto de despliegue a correr y monitorear.
- **Cambios de modelo/dimensión fuerzan un re-index completo** (disparador de re-index total del ADR-0090 §3) — los vectores de chunks solo son comparables dentro de un `corpus_version`.

### Neutras
- La elección concreta vive en el registro de modelos del ADR-0003 y en el `corpus_version` de cada chunk; migrar a un proveedor gestionado después es un swap de adaptador documentado más un re-index, no un rewrite.
- Un índice solo léxico (§6) es un despliegue de primera clase, no uno degradado: es lo que siembra el arranque local del full-stack, y un reindexado denso lo mejora en el sitio.

## Referencias
- [ADR-0090: Gobernanza de Conocimiento RAG](./0090-rag-knowledge-governance.es.md) — el contrato gobernante que esta plataforma realiza
- [ADR-0003: Gobernanza de Selección de Modelos](../ai-augmented/0003-model-selection-governance.es.md) — el registro/política al que este asiento de embedding conforma
- [ADR-0001: Ingeniería del Harness](../ai-augmented/0001-harness-engineering.es.md) — enrutamiento de egress de proveedores externos y puertos de proveedor
- [ADR-0088: Identidad Soberana para IA Agéntica](./0088-sovereign-identity-agentic-ai.es.md) — la postura de soberanía que favorece el self-hosting
- Gaps [`GT-538`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-538) · [`GT-539`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-539) · [`GT-540`](../../../control-center/gaps/gap-reference-catalog.es.md#gt-540) — la ola de operacionalización que este ADR desbloquea
- Leaderboard de embeddings MTEB / MMTEB (Qwen3-Embedding #1 abierto, Apache-2.0), 2026

---
[Volver al Índice de ADRs Core](./README.es.md)

> **Firma del Agente:** Agente Arquitecto
