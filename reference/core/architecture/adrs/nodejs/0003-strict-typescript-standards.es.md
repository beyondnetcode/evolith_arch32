# [ADR 0003](0003-strict-typescript-standards.md): Estándares Estrictos de TypeScript

## Estado
Accepted

## Fecha
2026-05-08

## Contexto
El TypeScript débilmente tipado (uso de `any`, falta de tipos de retorno, `any` implícito proveniente de librerías) crea la misma clase de bugs que el JavaScript plano mientras mantiene una falsa sensación de seguridad de tipos. Esto anula el valor principal de TypeScript en el desarrollo empresarial.

## Decisión
Imponer una configuración estricta de TypeScript y reglas de ESLint a través de todo el monorepo.

**Banderas obligatorias en `tsconfig.json`:**
```json
{
 "compilerOptions": {
 "strict": true,
 "noImplicitAny": true,
 "strictNullChecks": true,
 "noUnusedLocals": true,
 "noUnusedParameters": true
 }
}
```

**Reglas obligatorias de ESLint:**
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/explicit-function-return-type`: error
- `@typescript-eslint/no-floating-promises`: error
- `eslint-plugin-boundaries`: impone las reglas de importación de capas (Core no puede importar de Infraestructura)

Todas las reglas se imponen en CI - los PRs con errores de TypeScript se bloquean impidiendo su fusión.

## Consecuencias

### Positivas
- Elimina toda una clase de errores en tiempo de ejecución de nulo/indefinido en el momento de la compilación.
- Impone código autodocumentado a través de tipos de retorno explícitos.
- `eslint-plugin-boundaries` hace que las violaciones de capas hexagonales sean un error de construcción, no un hallazgo de revisión de código.

### Negativas
- Mayor sobrecarga de desarrollo inicial - los desarrolladores deben ser explícitos con todos los tipos.
- Las librerías de terceros con definiciones de TypeScript pobres requieren un envoltorio de tipado cuidadoso.

## Referencias
- [ADR-0001: Orquestación de Monorepo](../../adrs/core/0001-monorepo-orchestration-principle.es.md)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde el TypeScript débilmente tipado (uso de `any`, falta de tipos de retorno, `any` implícito proveniente de librerías) crea la misma clase de bugs que el JavaScript plano mientras mantiene una falsa sensación de seguridad de tipos, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estándares Estrictos de TypeScript
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0001: Orquestación de Monorepo](../../adrs/core/0001-monorepo-orchestration-principle.es.md)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

TypeScript es un lenguaje maduro en etapa de adopción mainstream con posición dominante en el desarrollo empresarial JavaScript. Microsoft proporciona soporte a largo plazo con releases trimestrales y fuertes garantías de retrocompatibilidad. Adopción casi universal en frontend y backend. Vigencia esperada: 5+ años.

## Fuentes Actuales

- Notas de lanzamiento de TypeScript — https://devblogs.microsoft.com/typescript, consultado 2026-06-20.
- Descargas npm de typescript — https://www.npmjs.com/package/typescript, consultado 2026-06-20.
- Encuestas State of JS sobre adopción de TypeScript — https://stateofjs.com, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
