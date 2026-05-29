# ADR 0050: Estandarización de la Estrategia de Ramas Gitflow

## Estado
Aceptado

## Contexto
A medida que el ecosistema crece con múltiples sistemas satélites y colaboradores, la falta de una estrategia de ramas unificada ha provocado ciclos de lanzamiento inconsistentes, dificultad para rastrear el código listo para producción y regresiones ocasionales. Necesitamos un flujo de trabajo robusto y estandarizado para gestionar características, lanzamientos y correcciones de errores.

## Decisión
Adoptaremos **Gitflow** como la estrategia de ramas obligatoria para los sistemas satélites que usen esta referencia de arquitectura progresiva y su toolset Evolith.

### Modelo de Ramas:
1. **`main`**: Almacena el historial oficial de lanzamientos. Todo el código en `main` debe estar listo para producción.
2. **`develop`**: Sirve como rama de integración para características. Aquí es donde se construye el "próximo lanzamiento".
3. **`feature/*`**: Se utilizan para desarrollar nuevas características. Se ramifican desde `develop` y deben fusionarse de nuevo en `develop` mediante un Pull Request.
4. **`release/*`**: Se utilizan cuando `develop` ha adquirido suficientes características para un lanzamiento. Solo se permiten correcciones de errores y actualizaciones de metadatos aquí. Se fusiona tanto en `main` como en `develop`.
5. **`hotfix/*`**: Se utilizan para parchear rápidamente los lanzamientos de producción. Se ramifican desde `main` y se fusionan tanto en `main` como en `develop`.

### Requisitos de Pull Request (PR):
- Todas las fusiones en `develop` y `main` deben realizarse a través de Pull Requests.
- Los PR deben pasar todas las verificaciones automáticas de CI (Linting, Pruebas, Auditoría de Seguridad).
- Se requiere una revisión por pares obligatoria antes de la fusión.

## Consecuencias
- **Pros**:
 - Distinción clara entre el código listo para producción y el trabajo en curso.
 - Enfoque sistemático para lanzamientos y parches de emergencia.
 - Mejora de la colaboración y la calidad del código mediante PRs y revisiones obligatorias.
- **Cons**:
 - Mayor sobrecarga administrativa en comparación con modelos más simples (como Trunk-Based Development).
 - Requiere que los desarrolladores sean disciplinados con el cambio de ramas y las fusiones.

---
[Volver al Índice](./README.es.md)
