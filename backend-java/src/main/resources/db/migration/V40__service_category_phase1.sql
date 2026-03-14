ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS category_id uuid;

CREATE INDEX IF NOT EXISTS idx_professional_service_category_id
    ON professional_service (category_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_professional_service_category'
    ) THEN
        ALTER TABLE professional_service
            ADD CONSTRAINT fk_professional_service_category
            FOREIGN KEY (category_id) REFERENCES categories(id);
    END IF;
END $$;

UPDATE professional_service s
SET category_id = primary_category.category_id
FROM (
    SELECT DISTINCT ON (pc.professional_id)
        pc.professional_id,
        pc.category_id
    FROM professional_categories pc
    INNER JOIN categories c ON c.id = pc.category_id
    WHERE c.active = TRUE
    ORDER BY
        pc.professional_id,
        COALESCE(c.display_order, 2147483647),
        c.name
) primary_category
WHERE s.professional_id = primary_category.professional_id
  AND s.category_id IS NULL;

WITH rubro_source AS (
    SELECT
        pp.id AS professional_id,
        CASE
            WHEN normalized_rubro = '' THEN NULL
            WHEN normalized_rubro = 'peluqueria' THEN 'cabello'
            WHEN normalized_rubro = 'cejas' THEN 'pestanas-cejas'
            WHEN normalized_rubro = 'pestanas' THEN 'pestanas-cejas'
            WHEN normalized_rubro = 'pestanas-y-cejas' THEN 'pestanas-cejas'
            WHEN normalized_rubro = 'faciales' THEN 'estetica-facial'
            ELSE normalized_rubro
        END AS mapped_slug
    FROM (
        SELECT
            id,
            regexp_replace(
                trim(both '-' FROM regexp_replace(
                    immutable_unaccent(lower(COALESCE(rubro, ''))),
                    '[^a-z0-9]+',
                    '-',
                    'g'
                )),
                '-+',
                '-',
                'g'
            ) AS normalized_rubro
        FROM professional_profile
    ) pp
)
UPDATE professional_service s
SET category_id = c.id
FROM rubro_source rs
INNER JOIN categories c
    ON c.slug = rs.mapped_slug
   AND c.active = TRUE
WHERE s.professional_id = rs.professional_id
  AND s.category_id IS NULL;
