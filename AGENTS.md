# AGENTS.md

## Instrucción principal
Este repositorio tiene una carpeta de contexto llamada `contexto/` que debe tratarse como documentación operativa viva del proyecto.

Antes de hacer cambios relevantes en código, leer los archivos de contexto aplicables.
Después de hacer cambios relevantes, actualizar esos archivos si quedaron desalineados con el estado real del código.

## Archivos de contexto
- `contexto/README_sin_whatsapp.md`
- `contexto/rutas-y-modulos.md`
- `contexto/backend-endpoints.md`
- `contexto/infra-y-configuracion_sin_whatsapp.md`

## Regla obligatoria
Responder en español.
No finalizar tareas que cambien comportamiento, estructura, endpoints, módulos, rutas o configuración sin revisar si corresponde actualizar `contexto/`.

## Flujo
1. Leer contexto relevante
2. Revisar código involucrado
3. Plan corto
4. Implementar
5. Actualizar contexto afectado
7. Revisar y corregir la deployabilidad, luego de aplicar los cambios y corregit para que quede ok la deployabilidad
6. Resumir cambios y pendientes

## Restricciones
- No inventar estructura nueva sin necesidad
- No documentar features no implementadas
- No dejar documentación contradictoria con el código
- No omitir actualización de contexto cuando el cambio lo requiere

## Prioridad
La fuente de verdad final es el código real.
Si la documentación no coincide con el código, corregir la documentación.

## Qué actualizar según el cambio
- Endpoints -> `contexto/backend-endpoints.md`
- Módulos o rutas -> `contexto/rutas-y-modulos.md`
- Infra, env, docker, render, compose -> `contexto/infra-y-configuracion_sin_whatsapp.md`
- Estado general del sistema -> `contexto/README_sin_whatsapp.md`