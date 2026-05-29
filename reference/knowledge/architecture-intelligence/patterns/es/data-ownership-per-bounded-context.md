# Propiedad de datos por Bounded Context

## Problema

Un sistema modular pierde claridad cuando varios módulos dependen de las mismas estructuras internas de datos.

Esto genera límites débiles, responsabilidad ambigua y mayor impacto ante cambios.

## Contexto

Aplica cuando el producto se organiza por bounded contexts, módulos o capacidades de negocio.

## Solución

Cada bounded context debe ser dueño de los datos necesarios para aplicar sus reglas.

Otros contextos deben colaborar mediante contratos, eventos, proyecciones o modelos de lectura.

## Reglas

- Cada contexto posee su modelo de escritura.
- Otros contextos no modifican directamente datos internos.
- Las necesidades de lectura compartida deben modelarse explícitamente.
- La duplicación controlada de lectura es aceptable si reduce acoplamiento.

## Beneficios

- propiedad clara
- límites más fuertes
- evolución más segura
- mejor trazabilidad
- mejor preparación para extracción futura

## Tradeoffs

- puede requerir duplicación de lectura
- puede requerir sincronización
- puede introducir consistencia eventual
- requiere diseño explícito de reportes

## Posición Evolith

Recomendado.

## Nivel de adopción

Empresarial.

## Impacto IA

Alto. Los agentes IA generan mejores recomendaciones cuando la propiedad de datos es clara.

---

[Volver a Architecture Intelligence](../../README.es.md)
