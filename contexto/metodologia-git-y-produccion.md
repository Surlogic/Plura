# Metodologia Git Y Produccion

Actualizado el `2026-05-16`.

## Objetivo

Mantener un flujo simple para un equipo chico sin mezclar trabajo diario con codigo productivo.

La regla central queda asi:

- `prod` = rama reservada para el estado exacto que puede ir a produccion.
- `main` = integracion estable y rama de test actual.
- las ramas cortas salen de `main`, salvo hotfixes urgentes.

Esta metodologia prioriza simplicidad, PRs chicos y una promocion explicita a produccion. No agrega una rama `develop` porque hoy seria ceremonia extra sin aportar seguridad real.

## Ramas

### `prod`

- rama reservada para deploy productivo cuando exista el ambiente real de produccion.
- no se trabaja directo sobre ella.
- solo recibe:
  - promociones desde `main`
  - hotfixes urgentes ya revisados

### `main`

- rama base del trabajo normal y del ambiente de test actual.
- debe mantenerse estable y deployable.
- recibe features y fixes comunes mediante PR.

### Ramas cortas

- `feature/<descripcion-corta>`
- `fix/<descripcion-corta>`
- `hotfix/<descripcion-corta>`

Ejemplos:

- `feature/login-google-mobile`
- `fix/reserva-sin-horarios`
- `hotfix/webhook-mercadopago`

## Flujo normal para features

1. Crear rama desde `main`.
2. Implementar el cambio con alcance acotado.
3. Abrir PR hacia `main`.
4. Pasar CI y revision.
5. Merge a `main`.
6. Cuando haya un grupo listo para salir, abrir PR `main -> prod`.
7. Mergear a `prod`; cuando exista el ambiente productivo separado, ese merge debera disparar el deploy productivo.

Reglas:

- una feature no debe entrar directo en `prod`.
- si un cambio no esta listo para salir, no se promociona a `prod`.
- preferir PRs chicos y squash merge para que el historial de `main` siga legible.

## Flujo normal para fixes no urgentes

1. Crear `fix/<descripcion>` desde `main`.
2. PR hacia `main`.
3. Sale a produccion en la proxima promocion `main -> prod`.

## Flujo para hotfixes de produccion

Usar solo cuando produccion esta rota o hay riesgo real para usuarios, cobros o datos.

1. Crear `hotfix/<descripcion>` desde `prod`.
2. Aplicar solo la correccion necesaria.
3. Abrir PR hacia `prod`.
4. Pasar CI y revision.
5. Mergear a `prod` para desplegar.
6. Inmediatamente despues, abrir PR de retorno `prod -> main` para que `main` no pierda el fix.

Regla:

- nunca dejar un hotfix solo en `prod`; siempre vuelve a `main`.

## Regla de deploy

- Backend de test actual: despliega desde `main` al Fly existente.
- Backend productivo futuro: debera desplegar solo desde `prod`, pero ese workflow no debe activarse hasta crear el ambiente productivo separado.
- `main` valida por CI y sigue siendo la rama de prueba operativa.
- Web productiva futura: debera configurarse tambien para desplegar desde `prod`.
- Antes de cada promocion `main -> prod`, revisar migraciones, variables nuevas, contratos y checklist de QA afectado.

## Requisitos para mergear

Minimo recomendado:

- PR obligatorio.
- checks verdes.
- al menos una revision humana cuando el cambio toque auth, pagos, reservas, migraciones, seguridad o infraestructura.
- no mergear si la documentacion operativa quedo desalineada.

## Versionado y trazabilidad

- despues de cada salida relevante a produccion, crear un tag sobre `prod`.
- formato sugerido simple: `prod-YYYY-MM-DD-N`.
- ejemplo: `prod-2026-05-16-1`.

Esto permite volver rapido a saber que commit estaba vivo en un dia dado sin introducir un release process pesado.

## Que hacer antes de agregar una feature

1. Confirmar si pertenece al lanzamiento actual o al roadmap futuro.
2. Definir que superficies toca: web, mobile, backend, infra o contratos.
3. Crear rama desde `main`.
4. Si toca endpoints, rutas, configuracion o comportamiento general, actualizar contexto junto con el codigo.

## Que hacer antes de un fix en produccion

1. Confirmar impacto real y urgencia.
2. Si puede esperar, usar `fix/*` desde `main`.
3. Si no puede esperar, usar `hotfix/*` desde `prod`.
4. Mantener el cambio minimo necesario.
5. Despues del deploy, devolver el cambio a `main`.

## Pendientes manuales para dejar la metodologia completamente cerrada

Estos pasos no viven en el repo y deben configurarse en GitHub/Vercel:

1. Proteger `prod`:
   - bloquear push directo
   - exigir PR
   - exigir checks verdes
2. Proteger `main` con las mismas reglas base.
3. Crear el ambiente productivo real separado del ambiente de test actual.
4. Crear el environment `production` en GitHub Actions y guardar ahi el token del Fly productivo cuando exista.
5. Agregar el workflow productivo desde `prod` solo cuando el Fly productivo exista.
6. Restringir el environment `production` para que solo pueda desplegar desde `prod`.
7. Configurar Vercel para que la rama de produccion sea `prod` y no `main` cuando se cree la web productiva.
8. Definir quien puede aprobar promociones `main -> prod` y hotfixes.

## Resumen operativo

```text
feature/* o fix/* -> main -> test actual
main -> prod -> produccion futura
hotfix/* desde prod -> prod -> produccion futura -> retorno a main
```

Es el flujo mas simple que hoy separa bien desarrollo, release y emergencia sin sumar ramas permanentes innecesarias.
