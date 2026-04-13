# AGENTS.md

## Instrucción principal
Este repositorio tiene una carpeta de contexto llamada `contexto/` que debe tratarse como documentación operativa viva del proyecto.

Antes de hacer cambios relevantes en código, leer los archivos de contexto aplicables.
Después de hacer cambios relevantes, actualizar esos archivos si quedaron desalineados con el estado real del código.

La prioridad es resolver la funcionalidad o corrección pedida con el menor alcance real posible, sin revisar ni releer partes innecesarias del repo.

## Archivos de contexto
- `contexto/README_sin_whatsapp.md`
- `contexto/rutas-y-modulos.md`
- `contexto/backend-endpoints.md`
- `contexto/infra-y-configuracion_sin_whatsapp.md`

## Regla obligatoria
No responder ambiguedades asi no gastamos tokens, solo responder o preguntar lo esencial y los cambios hechos y como quedó en el resumen.
Responder en español y si se commitean cambios tambien en español.
No finalizar tareas que cambien comportamiento, estructura, endpoints, módulos, rutas o configuración sin revisar si corresponde actualizar contexto.
Cambiar solo lo que hay que cambiar, no cambiar todo el código, solo la parte necesaria; si es necesario tocar todo, se toca.
No responder con explicaciones que no importan, solo con el resumen final si es requerido en el chat.

## Regla de alcance y eficiencia
Asumir por defecto que el pedido del usuario es una funcionalidad o corrección acotada, no una auditoría general.

- No expandir el trabajo por cuenta propia.
- No hacer auditorías amplias si no fueron pedidas.
- No recorrer web, mobile, backend y contexto completo “por las dudas”.
- No abrir todos los archivos de `contexto/` en cada tarea si no hace falta.
- No proponer refactors generales si no son necesarios para resolver el pedido.
- No agregar mejoras secundarias fuera del alcance salvo que sean obligatorias para que el cambio funcione.

Leer solo el contexto mínimo necesario por defecto.
Si el cambio toca contratos, endpoints, rutas, configuración o comportamiento transversal, ampliar revisión solo en esas áreas.

## Cómo decidir cuánto contexto leer
Antes de empezar, delimitar qué parte del sistema sí está involucrada y cuál no.

Leer contexto completo o ampliar revisión solo cuando el cambio toque alguna de estas áreas:
- endpoints o contratos backend
- rutas o módulos visibles
- infraestructura, variables o deploy
- comportamiento general documentado

No hace falta abrir contexto completo si el cambio es local y no altera nada de eso.

Ejemplos de cambios que deben mantenerse acotados:
- fix visual de una pantalla
- ajuste puntual de UX
- bugfix localizado
- validación puntual
- cambio pequeño de backend sin alterar contrato público
- corrección de lógica interna sin impacto estructural

## Flujo
1. Entender la funcionalidad o corrección pedida
2. Delimitar alcance concreto en pocas líneas
3. Leer contexto relevante solo en la parte necesaria
4. Revisar código involucrado
5. Plan corto
6. Implementar
7. Actualizar contexto afectado solo si realmente quedó desalineado
8. Revisar y corregir la deployabilidad, luego de aplicar los cambios y corregir para que quede ok la deployabilidad
9. Resumir cambios y pendientes reales

## Restricciones
- No inventar estructura nueva sin necesidad
- No documentar features no implementadas
- No dejar documentación contradictoria con el código
- No omitir actualización de contexto cuando el cambio lo requiere
- No convertir una corrección puntual en refactor general sin necesidad
- No tocar módulos no relacionados solo por prevención

## Prioridad
La fuente de verdad final es el código real.
Si la documentación no coincide con el código, corregir la documentación en la parte afectada por la tarea actual.

## Qué actualizar según el cambio
- Endpoints -> `contexto/backend-endpoints.md`
- Módulos o rutas -> `contexto/rutas-y-modulos.md`
- Infra, env, docker, render, compose -> `contexto/infra-y-configuracion_sin_whatsapp.md`
- Estado general del sistema -> `contexto/README_sin_whatsapp.md`

## Forma de respuesta esperada
Responder con foco en:
- qué se cambió
- dónde se cambió
- cómo quedó
- qué pendiente real existe si aplica
- qué contexto se actualizó, si hizo falta

Si no hizo falta tocar contexto, decirlo breve y seguir.