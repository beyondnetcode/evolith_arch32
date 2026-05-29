# Estandar Web Frontend React

> Navegacion bilingue: [English](./react-web-frontend-standard.md)

## 1. Proposito

Este estandar define la linea base reutilizable de Evolith para aplicaciones web empresariales con React. Cubre arquitectura, estructura boilerplate, gobierno del sistema UI, acceso a datos, gestion de estado, pruebas, accesibilidad, seguridad y criterios de promocion.

Este estandar no es una copia de una implementacion de producto. UMS puede usarse como evidencia aplicada, pero los detalles especificos de UMS permanecen locales salvo que se promuevan mediante ADR, estandar de gobierno o patron canonico.

## 2. Autoridad y alcance

| Area | Estandar Evolith | Referencia aplicada de producto |
|---|---|---|
| Principios de arquitectura | Normativo | Debe cumplir o documentar desviacion |
| Estructura de carpetas | Linea base normativa con puntos de extension permitidos | Puede especializarse por bounded context o modulo de producto |
| Tokens UI | Nombres y gobierno normativos | El producto posee valores concretos y branding |
| Librerias | Perfil recomendado salvo aprobacion por ADR | El producto fija versiones concretas |
| Contratos API | Reglas normativas de frontera | El producto posee endpoints, headers y schemas concretos |
| Quality gates | Minimos normativos | El producto puede agregar gates mas estrictos |

## 3. Perfil React empresarial recomendado

El perfil por defecto para un producto React de Evolith DEBERIA usar:

| Aspecto | Perfil recomendado |
|---|---|
| Runtime | React 18 o superior |
| Build tool | Vite o equivalente aprobado |
| Lenguaje | TypeScript con tipado estricto |
| Routing | Router declarativo con limites de pantalla cargados de forma diferida |
| Estado servidor | TanStack React Query o equivalente aprobado |
| Estado cliente | Store liviano para UI, preferencias, sesion y estado de feature |
| Estilos | Tokens de diseno expuestos como variables CSS y consumidos por la capa de componentes |
| Validacion | Schemas runtime en fronteras externas |
| HTTP | Cliente centralizado con contexto de request, headers de seguridad y errores normalizados |
| Mocking | Mocking basado en service worker o servidor de prueba para desarrollo y tests |
| Pruebas | Capas unitarias, componentes, integracion y E2E |

Cualquier cambio que haga obligatoria una herramienta especifica para todos los productos requiere un ADR.

## 4. Estructura boilerplate

Una aplicacion React de producto DEBERIA usar esta estructura o un mapeo equivalente documentado:

```text
src/
  domain/
    models/
    value-objects/
    policies/
  application/
    hooks/
    stores/
    use-cases/
    services/
  infrastructure/
    http/
    graphql/
    persistence/
    telemetry/
  presentation/
    shared/
      components/
      layouts/
      navigation/
      feedback/
    features/
    <bounded-context>/
      <feature>/
        screens/
        components/
        hooks/
        view-models/
  test/
    mocks/
    fixtures/
    helpers/
```

Reglas:

1. Los componentes de presentacion NO DEBEN llamar APIs externas directamente.
2. Los clientes de infraestructura DEBEN estar centralizados y ser inyectables o configurables.
3. Los conceptos de dominio DEBEN permanecer independientes de React y APIs del navegador.
4. Los stores de aplicacion NO DEBEN manipular directamente el DOM.
5. Los modulos especificos del producto NO DEBEN documentarse como estandares universales sin promocion.

## 5. Bootstrap de aplicacion

La raiz de la aplicacion DEBE centralizar providers transversales e inicializacion runtime.

Elementos requeridos:

- React strict mode o modo equivalente de seguridad runtime.
- Provider de datos para cache de server-state.
- Error boundary global.
- Router provider o raiz de router.
- Sincronizacion de locale cuando i18n esta habilitado.
- Arranque opcional de mocks controlado por variable de entorno.
- Ningun secreto de producto ni identificador de tenant de produccion hardcodeado.

## 6. Routing y composicion de pantallas

El routing DEBE ser declarativo, observable y modular.

Reglas requeridas:

1. Las pantallas de nivel ruta DEBERIAN cargarse de forma diferida cuando no pertenecen al camino inicial.
2. El fallback de Suspense DEBE usar un loader o skeleton reutilizable.
3. Las rutas desconocidas DEBEN redirigir o renderizar una pantalla not-found controlada.
4. Las definiciones de rutas NO DEBEN contener logica de negocio.
5. Las rutas protegidas DEBEN usar un patron reutilizable de authorization guard.

## 7. Layout shell

Las aplicaciones empresariales DEBERIAN usar un patron application shell con:

- barra superior o superficie global de comandos equivalente,
- navigation rail, navegacion lateral o contenedor responsive de navegacion,
- region principal de contenido,
- region de feedback o toasts,
- regiones de error y carga,
- landmarks de accesibilidad.

El patron shell es reutilizable. Nombres de producto, entradas de menu, rutas, iconos y etiquetas permanecen especificos del producto.

## 8. Entrega progresiva de UI y preparacion para microfrontends

Los productos web Evolith DEBEN iniciar con una **UI monolitica modular**. Los microfrontends son una **estrategia de extraccion de Fase 3+**, no la arquitectura inicial por defecto.

La progresion base es:

| Fase | Modelo de entrega UI | Guia requerida |
|---|---|---|
| Fase 1 | Una sola aplicacion React modular | Mantener una sola UI desplegable. Organizar por rutas, features, bounded contexts, componentes compartidos y fronteras de infraestructura. |
| Fase 2 | Ownership modular de UI mas fuerte | Mantener una sola UI desplegable mientras se fortalecen lazy loading, fronteras API, gobierno del sistema de diseno, pruebas y mapeo de referencia aplicada. |
| Fase 3+ | Microfrontends por excepcion | Extraer MFEs solo cuando la escala de equipos, la contencion de releases o los ciclos tecnologicos independientes justifiquen la complejidad operativa. |

Reglas:

1. Los productos NO DEBEN iniciar con microfrontends salvo que exista una desviacion ADR explicita aprobada.
2. Module Federation, composicion runtime con shell/orquestador y pipelines CI/CD por MFE NO forman parte de la linea base de Fase 1.
3. Primero DEBERIAN usarse estructura modular de carpetas, rutas lazy-loaded y ownership UI por bounded context para retrasar la distribucion hasta que sea necesaria.
4. La extraccion MFE DEBE cumplir con [ADR-0055: Estrategia de Arquitectura de Microfrontends](../../../../../architecture/adrs/core/0055-estrategia-arquitectura-microfrontends.md).
5. Cuando se introducen MFEs, los tokens de diseno, reglas compartidas de accesibilidad, telemetria y comportamiento transversal de seguridad siguen gobernados por los estandares Evolith.

## 9. Material Design 3 y tokens de diseno

Evolith estandariza el gobierno de tokens, no una paleta unica de producto.

Roles de token requeridos:

- primary, on-primary, primary-container, on-primary-container,
- equivalentes secondary y tertiary,
- roles error,
- roles surface y on-surface,
- roles surface-container,
- roles outline,
- roles inverse.

Reglas:

1. Los tokens DEBERIAN exponerse como variables CSS.
2. Las utilidades de componentes DEBERIAN consumir tokens semanticos en lugar de colores crudos.
3. Dark mode DEBERIA basarse en clase o atributo y ser deterministico.
4. Los valores de branding del producto pertenecen al repositorio de producto.
5. Los cambios globales de tokens requieren revision del sistema de diseno.

## 10. Gestion de estado

El estado DEBE clasificarse antes de implementarse.

| Tipo de estado | Propiedad |
|---|---|
| Estado servidor | Capa de query/cache |
| Estado UI | Store cliente liviano o estado local de componente |
| Estado de sesion | Frontera auth/session |
| Estado de formulario | Controlador especifico de formulario |
| Estado de dominio | Servicios de dominio/aplicacion, no componentes de presentacion crudos |

Reglas:

1. No duplicar server-state en stores cliente salvo justificacion.
2. Los stores deben exponer acciones orientadas a intencion.
3. Los efectos DOM pertenecen a adaptadores o effects de presentacion, no a definiciones de store.
4. El estado cliente persistente debe documentar almacenamiento, privacidad e invalidacion.

## 11. Acceso a datos y validacion runtime

El acceso externo DEBE pasar por fronteras de infraestructura.

Reglas requeridas:

1. Usar uno o mas clientes centralizados para HTTP, GraphQL u otros protocolos.
2. Inyectar contexto de request de forma consistente para idioma, tenant, correlacion o sesion.
3. Normalizar errores de infraestructura antes de llegar a presentacion.
4. Usar validacion runtime para datos externos cuando los contratos no estan totalmente garantizados en compile-time.
5. Las solicitudes mutantes DEBEN incluir controles de seguridad requeridos, como CSRF o equivalente cuando aplique.
6. Los nombres de headers y endpoints permanecen especificos del producto.

## 12. Internacionalizacion

La internacionalizacion DEBERIA estar centralizada.

Reglas:

1. Los componentes compartidos NO DEBEN hardcodear textos de usuario salvo que sean explicitamente locales.
2. El idioma del documento DEBERIA sincronizarse con el locale activo.
3. Las translation keys pertenecen al producto salvo que Evolith posea el componente.
4. La propagacion de locale hacia APIs debe documentarse en la frontera de request context.

## 13. Pruebas y quality gates

Gates minimos:

| Capa | Cobertura esperada |
|---|---|
| Unit | Funciones puras, hooks, stores, validators |
| Component | Estados UI, comportamiento relevante para accesibilidad, interacciones |
| Integration | Cliente API mas comportamiento API mockeado |
| E2E | Journeys criticos y flujos sensibles a autorizacion |

Las herramientas recomendadas pueden incluir Vitest, Testing Library, MSW y Playwright. Hacer obligatoria una herramienta para todos los productos Evolith requiere aprobacion por ADR.

## 14. Reglas de seguridad y privacidad

1. GUIDs crudos o identificadores tecnicos internos NO DEBEN mostrarse a usuarios finales salvo requerimiento explicito.
2. El contexto de tenant, usuario y autorizacion DEBE manejarse mediante fronteras documentadas.
3. Los secretos de producto NO DEBEN incrustarse en el bundle frontend.
4. Los mensajes de error DEBEN ser seguros para usuarios y logs.
5. Los identificadores solo de desarrollo DEBEN aislarse de builds productivos.

## 15. Accesibilidad y calidad UX

1. Los elementos interactivos DEBEN tener nombres accesibles.
2. La estructura de navegacion DEBERIA usar landmarks semanticos.
3. Los estados loading, empty, error y success DEBEN ser intencionales.
4. El uso de color DEBE respetar requisitos de contraste.
5. La navegacion por teclado DEBE considerarse para flujos core.

## 16. Camino de promocion desde producto hacia Evolith

Una practica de implementacion de producto puede promoverse solo cuando cumple todas las condiciones:

1. Es reutilizable en mas de un contexto de producto.
2. No esta acoplada a lenguaje de dominio, rutas API o branding local.
3. Tiene evidencia de implementacion o revision.
4. Tiene un estandar, ADR o patron canonico documentado en Evolith.
5. Incluye UMS u otras referencias de producto como ejemplos, no como autoridad.

## 17. Mapeo obligatorio de referencia aplicada

Todo producto que aplique este estandar DEBERIA mantener un documento de mapeo con:

| Topico Evolith | Artefacto de producto | Clasificacion |
|---|---|---|
| Bootstrap | Entry point raiz del producto | Evidencia aplicada |
| Routing | Configuracion de rutas del producto | Evidencia aplicada |
| Tokens UI | Archivos de tema y tokens del producto | Valores locales |
| Cliente HTTP | Cliente de infraestructura del producto | Evidencia aplicada con headers locales |
| Pruebas | Configuracion de pruebas del producto | Quality gate aplicado |
| Desviaciones | Decisiones locales | Deben justificarse |

---
[Volver al portal del estandar React](./README.es.md)