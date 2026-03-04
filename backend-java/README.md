# Backend Java

## Timezone del sistema (MVP)
- Zona fija: `APP_TIMEZONE` (default `America/Montevideo`).
- Endpoint de slots y creación de reservas usan esta zona para:
  - calcular "horas pasadas";
  - validar fecha futura;
  - interpretar `startDateTime` recibido.
- Recomendación de contrato frontend:
  - enviar `date` como `YYYY-MM-DD` para slots;
  - enviar `startDateTime` en ISO (`YYYY-MM-DDTHH:mm` o con offset, ej. `2026-02-27T13:00:00Z`).

## Search de escala (PostGIS + trigram)
- Script SQL: `backend-java/db/search_scale_foundation.sql`
- Extensiones: `postgis`, `pg_trgm`, `unaccent`, `pgcrypto`.
- Crea/actualiza:
  - columnas geo y ranking en `professional_profile`;
  - tabla `available_slot` (precomputada);
  - tabla `geo_location_seed` para autocomplete;
  - índices GIST/GIN y de filtros.

Aplicación manual:

```bash
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/search_scale_foundation.sql
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/professional_coordinates.sql
```

## Geocodificación de direcciones existentes
- Script: `backend-java/scripts/geocode_professional_profiles.sh`
- Requisitos:
  - `NEXT_PUBLIC_MAPBOX_TOKEN` exportado en el entorno.
  - `.env` del backend con `SPRING_DATASOURCE_*`.

Ejemplo:

```bash
export NEXT_PUBLIC_MAPBOX_TOKEN=pk...
backend-java/scripts/geocode_professional_profiles.sh 500
```
