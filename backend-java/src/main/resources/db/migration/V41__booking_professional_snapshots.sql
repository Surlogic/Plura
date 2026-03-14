ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS professional_slug_snapshot TEXT;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS professional_display_name_snapshot TEXT;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS professional_location_snapshot TEXT;

UPDATE booking b
SET professional_slug_snapshot = COALESCE(
        NULLIF(b.professional_slug_snapshot, ''),
        NULLIF(profile.slug, '')
    ),
    professional_display_name_snapshot = COALESCE(
        NULLIF(b.professional_display_name_snapshot, ''),
        NULLIF(users.full_name, ''),
        NULLIF(profile.display_name, '')
    ),
    professional_location_snapshot = COALESCE(
        NULLIF(b.professional_location_snapshot, ''),
        NULLIF(profile.location, ''),
        NULLIF(profile.location_text, '')
    )
FROM professional_profile profile
LEFT JOIN app_user users ON users.id = profile.user_id
WHERE b.professional_id = profile.id;
