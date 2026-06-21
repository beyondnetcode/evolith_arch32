# ADR-0096: Gobernanza de Arquitectura Edge Computing

**Estado:** Accepted  
**Fecha:** 2026-06-20  
**Tags:** `architecture`, `execution`, `topology`

## Contexto

Edge computing coloca workloads cerca de usuarios, dispositivos o redes restringidas donde la coordinacion central del runtime esta limitada por latencia, conectividad o restricciones regulatorias. Sin gobernanza explicita, los productos satelite corren riesgo de bifurcar logica de dominio, sincronizacion de estado inconsistente, seguridad debil en entornos restringidos y modos de fallo no observables.

## Decision

Adoptamos la topologia de ejecucion **Edge Computing** con los siguientes principios rectores:

1. **Justificacion de Localidad**: La ubicacion edge debe justificarse por latencia, resiliencia, localidad o restricciones regulatorias. No es una optimizacion sin justificacion documentada.
2. **Sincronizacion Explicita**: La sincronizacion de estado entre el edge y el plano de control central debe ser declarada, observable y consciente de conflictos.
3. **Seguridad Edge**: Los nodos edge deben aplicar autenticacion, autorizacion y manejo de secretos apropiados para entornos restringidos, incluso durante operacion offline.
4. **Observabilidad Bajo Conectividad Intermitente**: Los workloads edge deben reportar salud, fallo y contexto de traza con capacidad store-and-forward para periodos offline.
5. **Preservacion de Ownership de Dominio**: La logica edge no debe bifurcar comportamiento de dominio fuera del bounded context propietario. Edge es una eleccion de ubicacion, no una frontera de ownership.

Todos los satelites que adopten esta topologia DEBEN proporcionar `edge-computing.config.json` declarando `syncStrategy`, `edgeIsolation` y `conflictResolution`.

## Consecuencias

- **Positivo:** Habilita ejecucion de baja latencia, tolerante a offline y consciente de localidad sin sacrificar gobernanza arquitectonica. Preserva ownership de dominio a traves de fronteras de ubicacion.
- **Negativo:** Agrega sobrecarga de configuracion y sincronizacion para adoptantes edge. Las estrategias de resolucion de conflictos requieren diseno explicito por workload.
- **Cumplimiento:** Gobernado mediante EC-R01 a EC-R03 en las reglas de arquitectura ejecutables y aplicado por el evaluador Native y la politica OPA.

> **Firma del Agente:** Architect Agent
