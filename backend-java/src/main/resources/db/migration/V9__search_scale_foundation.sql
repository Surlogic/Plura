-- Source: backend-java/db/search_scale_foundation.sql
-- Search foundation for real-scale traffic (PostgreSQL + PostGIS + trigram).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, COALESCE(value, ''));
$$;

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS geom geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

UPDATE professional_profile profile
SET display_name = users.full_name
FROM app_user users
WHERE profile.user_id = users.id
  AND (profile.display_name IS NULL OR btrim(profile.display_name) = '');

UPDATE professional_profile
SET location_text = location
WHERE (location_text IS NULL OR btrim(location_text) = '')
  AND location IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_prof_display_name_from_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE professional_profile
  SET display_name = NEW.full_name
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prof_display_name ON app_user;
CREATE TRIGGER trg_sync_prof_display_name
AFTER INSERT OR UPDATE OF full_name ON app_user
FOR EACH ROW
EXECUTE FUNCTION sync_prof_display_name_from_user();

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  image_url text,
  display_order integer,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS professional_categories (
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, category_id)
);

CREATE TABLE IF NOT EXISTS available_slot (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  start_at timestamp NOT NULL,
  end_at timestamp NOT NULL,
  status varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chk_available_slot_status CHECK (status IN ('AVAILABLE', 'BOOKED')),
  CONSTRAINT uq_available_slot_professional_start UNIQUE (professional_id, start_at)
);

CREATE TABLE IF NOT EXISTS geo_location_seed (
  id bigserial PRIMARY KEY,
  label text NOT NULL,
  city text NOT NULL,
  lat double precision,
  lng double precision,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_geo_location_seed_label_city UNIQUE (label, city)
);

INSERT INTO geo_location_seed (label, city, lat, lng, active)
VALUES
  ('Centro', 'Montevideo', -34.9053, -56.1892, true),
  ('Pocitos', 'Montevideo', -34.9190, -56.1518, true),
  ('Carrasco', 'Montevideo', -34.8871, -56.0606, true),
  ('Cordón', 'Montevideo', -34.9058, -56.1815, true),
  ('Parque Rodó', 'Montevideo', -34.9147, -56.1675, true),
  ('Centro', 'Maldonado', -34.9058, -54.9597, true),
  ('Punta del Este', 'Maldonado', -34.9683, -54.9431, true),
  ('La Barra', 'Maldonado', -34.9028, -54.7857, true),
  ('Centro', 'Canelones', -34.5228, -56.2778, true),
  ('Ciudad de la Costa', 'Canelones', -34.8167, -55.9500, true),
  ('Centro', 'Colonia', -34.4714, -57.8442, true),
  ('Centro', 'Salto', -31.3833, -57.9667, true),
  ('Centro', 'Paysandú', -32.3214, -58.0756, true),
  ('Palermo', 'Buenos Aires', -34.5875, -58.4200, true),
  ('Recoleta', 'Buenos Aires', -34.5889, -58.3974, true),
  ('Belgrano', 'Buenos Aires', -34.5620, -58.4565, true)
ON CONFLICT (label, city) DO UPDATE
SET lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    active = EXCLUDED.active;

CREATE INDEX IF NOT EXISTS idx_prof_geom
ON professional_profile USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_prof_name_trgm
ON professional_profile USING GIN (immutable_unaccent(lower(display_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_service_name_trgm
ON professional_service USING GIN (immutable_unaccent(lower(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_prof_active
ON professional_profile(active);

CREATE INDEX IF NOT EXISTS idx_prof_category
ON professional_categories(category_id, professional_id);

CREATE INDEX IF NOT EXISTS idx_booking_prof_start
ON booking(professional_id, start_date_time);

CREATE INDEX IF NOT EXISTS idx_available_slot_prof_start
ON available_slot(professional_id, start_at);

CREATE INDEX IF NOT EXISTS idx_available_slot_start
ON available_slot(start_at);

CREATE INDEX IF NOT EXISTS idx_geo_seed_label_trgm
ON geo_location_seed USING GIN (immutable_unaccent(lower(label)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_geo_seed_city_trgm
ON geo_location_seed USING GIN (immutable_unaccent(lower(city)) gin_trgm_ops);
