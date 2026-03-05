# Fase 4 - Arquitectura objetivo (100K profesionales / 1M usuarios)

## Principios
- No romper endpoints existentes
- Migración gradual por flags
- Postgres como Source of Truth
- Todos los módulos nuevos con fallback y rollback por flag

## 1) Search Engine
Recomendación inicial: **Meilisearch** por simplicidad operativa.
Alternativa enterprise: OpenSearch.

### Nuevos módulos
- `SearchIndexService`
- `SearchSyncPublisher`
- `SearchIndexerWorker`

### Documento índice
- professional_id
- slug
- display_name
- rubro
- headline
- location_text
- categories[]
- services[]
- rating
- lat/lng
- has_availability_today

### Flujo de sync
Publicar eventos en:
- create/update professional profile
- service update
- category assignment
- photo metadata update
- schedule update

### Lectura en `/api/search`
1. query al search engine -> IDs ordenados
2. hidratación batch en Postgres
3. cache resultado final (capa ya existente)

### Suggest
- `/api/search/suggest` desde search engine (prefix)
- fallback SQL por flag

### Flags
- `SEARCH_ENGINE_ENABLED=false`
- `SEARCH_ENGINE_SUGGEST_ENABLED=false`

## 2) Disponibilidad escalable

### Estrategia
- mantener `schedule_json` en Postgres
- usar resumen por profesional:
  - `has_availability_today`
  - `next_available_at` (opcional)
- `/slots` dinámico + cache Redis por día
- `available_slot` solo transición

### Flags
- `AVAILABLE_SLOT_REBUILD_ENABLED=true`
- `SEARCH_AVAILABILITY_SOURCE=AVAILABLE_SLOT` (valores: `AVAILABLE_SLOT|FLAG`)

## 3) Async jobs con SQS

### Jobs
- schedule summary rebuild
- thumbnail generation
- search indexing
- geocoding retries

### Componentes
- `SqsPublisher`
- `SqsConsumerWorker`
- idempotency keys
- DLQ

### Flags
- `SQS_ENABLED=false`
- `THUMBNAIL_SQS_ENABLED=false`
- `INDEXER_SQS_ENABLED=false`

## 4) Imágenes en R2

### Modelo
- backend genera signed upload URL
- validar tipo/tamaño
- DB guarda solo `object_key`
- public URL por dominio CDN

### Compatibilidad
- mantener URLs viejas funcionando
- nuevas subidas en formato key-only
- job batch opcional de migración legacy

### Flags
- `IMAGE_STORAGE_PROVIDER=LOCAL` (`LOCAL|R2`)
- `IMAGE_MIGRATION_ENABLED=false`

## 5) DB a escala
- read replica para lecturas públicas (search hydration, profile)
- pool tuning por entorno
- opcional RDS Proxy

## Plan sin downtime

### Paso A
- Deploy módulos nuevos con flags OFF.
- Dashboard baseline + smoke tests.

### Paso B
- Encender indexación asíncrona sin servir tráfico desde search engine.
- Validar lag, DLQ y tasa de reprocesos.

### Paso C
- Encender `SEARCH_ENGINE_SUGGEST_ENABLED` para 10% (si hay routing por env/tenant).
- Monitorear p95, exactitud funcional, errores.

### Paso D
- Encender `SEARCH_ENGINE_ENABLED` gradual.
- Mantener fallback SQL habilitable inmediato.

### Paso E
- Cambiar `SEARCH_AVAILABILITY_SOURCE=FLAG` cuando `has_availability_today` esté estable.
- Mantener rebuild `available_slot` activo en paralelo.

### Paso F
- Activar `IMAGE_STORAGE_PROVIDER=R2` solo para nuevas subidas.
- migración legacy por job batch si se aprueba.

## Docker local mínimo (dev)

### Servicios
- Redis
- Meilisearch

Ejemplo:

```yaml
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]
  meili:
    image: getmeili/meilisearch:v1.11
    environment:
      MEILI_MASTER_KEY: "dev-master-key"
    ports: ["7700:7700"]
```

## Validación mínima
- tests de contrato API (sin cambios)
- pruebas de index sync idempotente
- pruebas de fallback por flags
- carga mínima con k6 antes/después de cada etapa
