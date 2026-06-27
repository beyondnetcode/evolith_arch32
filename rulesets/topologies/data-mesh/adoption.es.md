# Guía de Adopción de Malla de Datos

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Arquitectura de Datos
**Topología:** Malla de Datos
**Reglas Relacionadas:** DAM-R01, DAM-R03, DAM-R09

## Propósito

Esta guía define los criterios de entrada, el proceso de incorporación de dominios, el flujo de creación de productos y la lista de verificación de preparación para adoptar la topología de malla de datos. La adopción es dirigida por el dominio — cada dominio ingresa a la malla cuando cumple los criterios de preparación y tiene capacidad operativa.

## Criterios de Entrada

Los dominios deben satisfacer los siguientes criterios antes de ingresar a la malla de datos:

- **Límite de Dominio Establecido:** Propiedad clara de dominio de negocio con un líder de dominio designado.
- **Líder de Producto de Datos Identificado:** Al menos una persona responsable del ciclo de vida del producto de datos.
- **Acceso a la Plataforma Concedido:** El equipo de dominio tiene acceso autenticado a la plataforma de autoservicio.
- **Capacitación de Gobernanza Completada:** El equipo de dominio ha completado la orientación de gobernanza federada.
- **Producto Inicial Identificado:** Al menos un conjunto de datos listo para formalización como producto.

Los dominios que no cumplan todos los criterios pueden participar solo como consumidores. La participación como consumidor requiere acceso a la plataforma y capacitación de gobernanza pero no propiedad de productos.

## Incorporación de Dominios

La incorporación sigue un proceso estructurado de cinco pasos:

1. **Registro del Dominio:** Registrar el dominio en la plataforma con contactos de propiedad y descripción de límites.
2. **Alineación de Gobernanza:** Revisar y reconocer los estándares corporativos de gobernanza de datos. Configurar políticas específicas del dominio.
3. **Incorporación a la Plataforma:** Configurar el espacio de trabajo del dominio, controles de acceso e integraciones de monitoreo.
4. **Identificación de Productos:** Identificar conjuntos de datos candidatos para formalización como producto. Priorizar por demanda de consumidores y calidad de datos.
5. **Lanzamiento del Producto Piloto:** Crear y publicar un producto piloto siguiendo la guía de creación de productos.

Duración de incorporación: habitualmente 2-4 semanas dependiendo de la complejidad del dominio y la madurez de datos existente.

## Guía de Creación de Productos

### Paso 1 — Definir el Producto

- Nombrar el producto con un identificador claro y específico del dominio.
- Definir la descripción del producto y los consumidores previstos.
- Clasificar los datos según los niveles corporativos de clasificación.
- Identificar fuentes de datos aguas arriba y consumidores aguas abajo.

### Paso 2 — Diseñar el Esquema

- Definir el esquema de salida con campos tipificados.
- Declarar claves primarias y restricciones de unicidad.
- Marcar campos PII explícitamente.
- Documentar descripciones de campos y definiciones de negocio.

### Paso 3 — Establecer SLAs de Calidad

- Definir umbrales de completitud, frescura, validez y unicidad según DAM-R07.
- Alinear SLAs con requisitos de consumidores y nivel de SLA.
- Configurar horario de verificaciones de salud y alertas.

### Paso 4 — Configurar Políticas de Acceso

- Definir controles de acceso basados en roles por producto.
- Publicar políticas de acceso en la plataforma.
- Configurar flujo de incorporación de consumidores.

### Paso 5 — Registrar y Publicar

- Registrar el producto en el índice de descubrimiento según DAM-R09.
- Validar completitud del registro.
- Publicar el producto y notificar a consumidores iniciales.

## Lista de Verificación de Preparación

- [ ] Dominio registrado en la plataforma
- [ ] Líder de dominio y líder de producto de datos designados
- [ ] Capacitación de gobernanza completada
- [ ] Espacio de trabajo de la plataforma configurado
- [ ] Esquema del producto piloto definido
- [ ] SLAs de calidad declarados
- [ ] Políticas de acceso publicadas
- [ ] Producto registrado en índice de descubrimiento
- [ ] Notificación a consumidores enviada
- [ ] Verificaciones de salud configuradas

## Comandos de Validación

```bash
# Verificar documentación de adopción
node .harness/scripts/ci/01-validate-docs.mjs --target data-mesh

# Verificar paridad bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

---
[Volver al Perfil de Malla de Datos](./README.es.md)
