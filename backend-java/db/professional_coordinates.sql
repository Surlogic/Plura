ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

UPDATE professional_profile
SET latitude = ST_Y(geom::geometry),
    longitude = ST_X(geom::geometry)
WHERE geom IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);

UPDATE professional_profile
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geom IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prof_lat_lng
  ON professional_profile(latitude, longitude);

