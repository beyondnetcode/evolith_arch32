# ADR-0084: Data Mesh y Datos como Producto

**Estado:** Aceptado  
**Fecha:** 2026-06-20  
**Etiquetas:** `architecture`, `data`, `topology`

## Contexto

Evolith opera a una escala corporativa donde un equipo centralizado de datos analíticos o un data lake monolítico se convierte en un cuello de botella severo. El modelo tradicional obliga a los expertos de dominio a entregar sus datos a equipos especializados que carecen de contexto del dominio, resultando en pipelines frágiles, incomprendidos y lentos para evolucionar. Necesitamos una arquitectura que escale las capacidades de datos analíticos sin romper la autonomía del dominio.

## Decisión

Adoptamos la topología **Data Mesh** para nuestra arquitectura analítica.

1. **Ownership de Datos Descentralizado Orientado al Dominio**: Los Bounded Contexts son dueños de sus datos analíticos de la misma manera que son dueños de sus datos operacionales. Los datos ya no son un "residuo" lanzado al otro lado del muro; son ciudadanos de primera clase del dominio.
2. **Datos como Producto (Data as a Product)**: Los dominios exponen sus datos analíticos como productos Descubribles, Direccionables, Confiables, Autodescriptivos, Interoperables y Seguros (DATSIS).
3. **Infraestructura de Datos Autoservicio como Plataforma**: Proporcionamos una plataforma de autoservicio que permite a los equipos de dominio construir, ejecutar y monitorear sus productos de datos de manera autónoma sin requerir experiencia especializada en Big Data.
4. **Gobernanza Computacional Federada**: Los contratos de datos, schemas, control de acceso y políticas de cumplimiento se definen globalmente pero se aplican computacionalmente en el punto de producción de datos.

Todos los satélites que adopten esta topología DEBEN declarar un archivo `data-mesh.config.json` que contenga su configuración como Data Product.

## Consecuencias

- **Positivas:** Elimina el cuello de botella del equipo centralizado de datos. Otorga a los equipos de dominio total autonomía sobre los planos operacional y analítico. Mejora radicalmente la calidad de los datos ya que los productores (quienes mejor entienden los datos) son responsables de ellos.
- **Negativas:** Mayor carga cognitiva para los equipos de dominio que ahora deben comprender los ciclos de vida de los productos de datos. Requiere una inversión significativa en la plataforma de datos de autoservicio para hacerlo factible.
- **Cumplimiento:** Gobernado a través de `DM-R01`, `DM-R02` y `DM-R03` en las reglas de arquitectura ejecutables.
