CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, COALESCE(value, ''));
$$;

CREATE MATERIALIZED VIEW IF NOT EXISTS search_professional_document_mv AS
WITH category_agg AS (
    SELECT
        pc.professional_id,
        array_agg(c.slug ORDER BY COALESCE(c.display_order, 9999), c.name) AS category_slugs,
        array_agg(c.name ORDER BY COALESCE(c.display_order, 9999), c.name) AS category_names,
        string_agg(DISTINCT c.name, ' ' ORDER BY c.name) AS category_names_text,
        (array_agg(c.image_url ORDER BY COALESCE(c.display_order, 9999), c.name))[1] AS primary_category_image_url
    FROM professional_categories pc
    JOIN categories c ON c.id = pc.category_id
    WHERE c.active = true
    GROUP BY pc.professional_id
),
service_agg AS (
    SELECT
        s.professional_id,
        array_agg(s.name ORDER BY s.name) AS service_names,
        string_agg(DISTINCT s.name, ' ' ORDER BY s.name) AS service_names_text,
        string_agg(DISTINCT COALESCE(c.name, ''), ' ' ORDER BY COALESCE(c.name, '')) FILTER (WHERE c.name IS NOT NULL) AS service_category_names_text,
        MIN(NULLIF(regexp_replace(s.price, '[^0-9\\.]', '', 'g'), '')::double precision) AS price_from
    FROM professional_service s
    LEFT JOIN categories c ON c.id = s.category_id AND c.active = true
    WHERE s.active = true
    GROUP BY s.professional_id
),
photo_agg AS (
    SELECT
        photo.professional_id,
        (array_agg(photo.url ORDER BY photo.position))[1] AS cover_image_url
    FROM professional_profile_photos photo
    GROUP BY photo.professional_id
)
SELECT
    p.id AS professional_id,
    COALESCE(NULLIF(p.slug, ''), regexp_replace(immutable_unaccent(lower(COALESCE(u.full_name, p.display_name, 'profesional'))), '[^a-z0-9]+', '-', 'g')) AS slug,
    COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional') AS display_name,
    COALESCE(p.public_headline, '') AS public_headline,
    COALESCE(p.rubro, '') AS rubro,
    regexp_replace(regexp_replace(immutable_unaccent(lower(COALESCE(p.rubro, ''))), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') AS rubro_slug,
    COALESCE(p.location_text, p.location, '') AS location_text,
    COALESCE(p.latitude, CASE WHEN p.geom IS NOT NULL THEN ST_Y(p.geom::geometry) END) AS latitude,
    COALESCE(p.longitude, CASE WHEN p.geom IS NOT NULL THEN ST_X(p.geom::geometry) END) AS longitude,
    p.geom,
    COALESCE(p.rating, 0)::double precision AS rating,
    COALESCE(p.reviews_count, 0)::integer AS reviews_count,
    COALESCE(service_agg.price_from, NULL) AS price_from,
    COALESCE(category_agg.category_slugs, ARRAY[]::text[]) AS category_slugs,
    COALESCE(category_agg.category_names, ARRAY[]::text[]) AS category_names,
    COALESCE(service_agg.service_names, ARRAY[]::text[]) AS service_names,
    COALESCE(photo_agg.cover_image_url, category_agg.primary_category_image_url) AS cover_image_url,
    p.has_availability_today,
    p.next_available_at,
    immutable_unaccent(lower(COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional'))) AS name_normalized,
    immutable_unaccent(lower(COALESCE(p.public_headline, ''))) AS headline_normalized,
    immutable_unaccent(lower(COALESCE(p.rubro, ''))) AS rubro_normalized,
    immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) AS location_text_normalized,
    immutable_unaccent(lower(COALESCE(category_agg.category_names_text, ''))) AS category_names_normalized,
    immutable_unaccent(lower(COALESCE(service_agg.service_names_text, ''))) AS service_names_normalized,
    immutable_unaccent(lower(COALESCE(service_agg.service_category_names_text, ''))) AS service_category_names_normalized,
    immutable_unaccent(lower(concat_ws(
        ' ',
        COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional'),
        COALESCE(p.public_headline, ''),
        COALESCE(p.rubro, ''),
        COALESCE(p.location_text, p.location, ''),
        COALESCE(category_agg.category_names_text, ''),
        COALESCE(service_agg.service_names_text, ''),
        COALESCE(service_agg.service_category_names_text, '')
    ))) AS search_document_normalized,
    to_tsvector('simple', immutable_unaccent(lower(concat_ws(
        ' ',
        COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional'),
        COALESCE(p.public_headline, ''),
        COALESCE(p.rubro, ''),
        COALESCE(p.location_text, p.location, ''),
        COALESCE(category_agg.category_names_text, ''),
        COALESCE(service_agg.service_names_text, ''),
        COALESCE(service_agg.service_category_names_text, '')
    )))) AS search_vector
FROM professional_profile p
JOIN app_user u ON u.id = p.user_id
LEFT JOIN category_agg ON category_agg.professional_id = p.id
LEFT JOIN service_agg ON service_agg.professional_id = p.id
LEFT JOIN photo_agg ON photo_agg.professional_id = p.id
WHERE p.active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_professional_document_mv_professional_id
    ON search_professional_document_mv (professional_id);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_geom
    ON search_professional_document_mv USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_category_slugs
    ON search_professional_document_mv USING gin (category_slugs);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_name_trgm
    ON search_professional_document_mv USING gin (name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_headline_trgm
    ON search_professional_document_mv USING gin (headline_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_rubro_trgm
    ON search_professional_document_mv USING gin (rubro_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_location_trgm
    ON search_professional_document_mv USING gin (location_text_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_categories_trgm
    ON search_professional_document_mv USING gin (category_names_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_services_trgm
    ON search_professional_document_mv USING gin (service_names_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_service_categories_trgm
    ON search_professional_document_mv USING gin (service_category_names_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_professional_document_mv_search_vector
    ON search_professional_document_mv USING gin (search_vector);

CREATE MATERIALIZED VIEW IF NOT EXISTS search_service_document_mv AS
SELECT
    s.id AS service_id,
    s.professional_id,
    s.name AS service_name,
    immutable_unaccent(lower(COALESCE(s.name, ''))) AS service_name_normalized,
    COALESCE(c.slug, '') AS category_slug,
    COALESCE(c.name, '') AS category_name,
    COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional') AS professional_name,
    immutable_unaccent(lower(COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional'))) AS professional_name_normalized,
    COALESCE(p.public_headline, '') AS public_headline,
    immutable_unaccent(lower(COALESCE(p.public_headline, ''))) AS headline_normalized,
    COALESCE(p.location_text, p.location, '') AS location_text,
    immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) AS location_text_normalized,
    COALESCE(p.latitude, CASE WHEN p.geom IS NOT NULL THEN ST_Y(p.geom::geometry) END) AS latitude,
    COALESCE(p.longitude, CASE WHEN p.geom IS NOT NULL THEN ST_X(p.geom::geometry) END) AS longitude,
    p.geom,
    COALESCE(p.rating, 0)::double precision AS rating,
    COALESCE(p.reviews_count, 0)::integer AS reviews_count,
    to_tsvector('simple', immutable_unaccent(lower(concat_ws(
        ' ',
        COALESCE(s.name, ''),
        COALESCE(c.name, ''),
        COALESCE(NULLIF(u.full_name, ''), NULLIF(p.display_name, ''), 'Profesional'),
        COALESCE(p.public_headline, ''),
        COALESCE(p.location_text, p.location, '')
    )))) AS search_vector
FROM professional_service s
JOIN professional_profile p ON p.id = s.professional_id
JOIN app_user u ON u.id = p.user_id
LEFT JOIN categories c ON c.id = s.category_id AND c.active = true
WHERE s.active = true
  AND p.active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_service_document_mv_service_id
    ON search_service_document_mv (service_id);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_geom
    ON search_service_document_mv USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_name_trgm
    ON search_service_document_mv USING gin (service_name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_professional_trgm
    ON search_service_document_mv USING gin (professional_name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_headline_trgm
    ON search_service_document_mv USING gin (headline_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_location_trgm
    ON search_service_document_mv USING gin (location_text_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_service_document_mv_search_vector
    ON search_service_document_mv USING gin (search_vector);
