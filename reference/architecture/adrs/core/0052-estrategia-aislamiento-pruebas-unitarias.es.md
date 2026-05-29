# [ADR 0052](0052-estrategia-aislamiento-pruebas-unitarias.md): Estrategia de Aislamiento de Pruebas Unitarias (Mocks vs Stubs)

## 1. Metadatos
* **ADR ID:** 0052
* **Título:** Estrategia de Aislamiento de Pruebas Unitarias (Mocks vs Stubs)
* **Estado:** Aprobado
* **Autores:** Oficina de Arquitectura Empresarial
* **Revisores:** Comité de Arquitectura Corporativa, Oficina del CTO
* **Fecha:** 2026-05-14
* **Tags:** `Pruebas`, `Calidad`, `Ingeniería-de-Software`, `Mejores-Prácticas`
* **ADRs Relacionados:** 
 * [ADR-0018: Pirámide de Pruebas y Puertas de Calidad Automatizadas](./0018-testing-pyramid-quality-gates.md)
 * [ADR-0019: Patrones de Diseño Táctico](./0019-tactical-design-patterns-future-proofing.md)

---

## Resumen Ejecutivo
En una Arquitectura Hexagonal, las pruebas unitarias son la defensa principal contra la regresión. Sin embargo, el uso inadecuado de dobles de prueba (Mocks y Stubs) a menudo conduce a "pruebas frágiles" que se rompen con la refactorización interna o proporcionan una falsa sensación de confianza. Este ADR establece la estrategia oficial para aislar componentes durante las pruebas unitarias, estandarizando el uso de Stubs para la verificación de estado y Mocks para la verificación de interacción.

---

## 2. Contexto del Problema
Los desarrolladores a menudo confunden Mocks y Stubs, utilizándolos indistintamente. Esto conduce a varios antipatrones:
1. **Sobre-Mocking (Mocking-itis):** Mockear clases internas o lógica de dominio, resultando en pruebas que solo verifican los detalles de implementación en lugar del comportamiento del negocio.
2. **Pruebas de Interacción Frágiles:** Usar Mocks para verificar cada llamada interna, haciendo que la refactorización sea imposible sin romper docenas de pruebas.
3. **Herramientas Inconsistentes:** Diferentes equipos usando diferentes librerías y patrones para el aislamiento, complicando las revisiones de código entre equipos.

---

## 3. Decisión
Adoptamos una **Estrategia de Aislamiento Centrada en Dobles** alineada con los principios de la Arquitectura Hexagonal.

### 3.1 Taxonomía de Dobles de Prueba
* **Stub (Entrada Indirecta):** Se utiliza para proporcionar al SUT (*System Under Test*) los datos o el estado necesarios. Los Stubs nunca fallan una prueba; simplemente "reemplazan" a un componente real (ej. un puerto de repositorio que devuelve una entidad ficticia).
* **Mock (Salida Indirecta):** Se utiliza para verificar que el SUT interactuó correctamente con un colaborador externo. Los Mocks *pueden* fallar una prueba si la interacción esperada no ocurrió (ej. verificar que se llamó a un puerto de notificación exactamente una vez).

### 3.2 Dónde Aislar (Reglas de Frontera)
* **Capa de Dominio (Entidades, Objetos de Valor):** Usar **Pruebas Basadas en Estado**. Los Mocks y Stubs están estrictamente PROHIBIDOS aquí. Pruebe la lógica de negocio pura utilizando objetos reales.
* **Capa de Aplicación (Manejadores de Comandos, Servicios):** Usar **Pruebas Unitarias Solitarias**. Todos los **Puertos (Interfaces)** deben aislarse utilizando Stubs (para obtener datos) o Mocks (para verificar efectos secundarios).
* **Capa de Infraestructura (Adaptadores):** Se desaconsejan las pruebas unitarias aquí en favor de las **Pruebas de Integración** utilizando Testcontainers. Si se requieren pruebas unitarias, solo mockear el cliente externo (ej. el driver de DB o el cliente HTTP).

### 3.3 Estándares de Herramientas
* **Stack .NET:** **NSubstitute** (Preferido por su sintaxis limpia) o **Moq 4.x**.
* **Stack Node.js:** **Jest** (Mocks nativos `jest.fn()` y `jest.spyOn()`).

---

## 4. Mejores Prácticas (El "Estilo Arquitectónico")
1. **Preferir Stubs sobre Mocks:** Verificar el estado siempre que sea posible. Solo use Mocks para verificar efectos secundarios que no se pueden observar a través del estado (ej. enviar un correo electrónico).
2. **Mockear Interfaces, no Clases:** Nunca mockear una clase concreta. Si siente la necesidad de mockear una clase, probablemente indica una abstracción faltante (Puerto).
3. **Una Verificación de Interacción por Prueba:** Una prueba debe verificar solo un efecto secundario significativo utilizando un Mock.
4. **No Mockear Todo:** Si un colaborador es un simple ayudante o un Objeto de Valor, use el objeto real. El aislamiento debe ocurrir en las fronteras del **Contexto Delimitado** o de la **Capa**.

---

## 5. Consecuencias

### Positivas:
* **Pruebas Amigables con la Refactorización:** Las pruebas se centran en el comportamiento y los contratos, permitiendo cambios de código internos sin romper la suite.
* **Velocidad:** Las pruebas aisladas siguen siendo ultrarrápidas al evitar E/S y configuraciones pesadas.
* **Claridad:** Los desarrolladores tienen una "receta" clara sobre cómo escribir pruebas para cada capa.

### Negativas:
* **Curva de Aprendizaje:** Requiere que los desarrolladores comprendan la sutil diferencia entre Stubs y Mocks.
* **Sobrecarga de Interfaces:** Obliga a la creación de interfaces (Puertos) para permitir el aislamiento, lo que puede sentirse como "código repetitivo" para casos simples.

---

## Conclusión Estratégica
La estandarización de nuestra estrategia de aislamiento asegura que nuestras pruebas unitarias cumplan su propósito previsto: proporcionar una validación rápida, confiable y a prueba de refactorizaciones de nuestra lógica de negocio. Al mockear solo en las fronteras (Puertos), mantenemos la pureza de nuestro Dominio mientras aseguramos la corrección de nuestra orquestación de Aplicación.

---
[Volver al Índice](../../../../MASTER_INDEX.es.md)
