-- Source: backend-java/db/service_description_image.sql

ALTER TABLE professional_service
  ADD COLUMN IF NOT EXISTS description varchar(200),
  ADD COLUMN IF NOT EXISTS image_url varchar(500);

