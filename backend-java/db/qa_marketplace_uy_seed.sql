-- Seed QA idempotente para marketplace:
-- - 24 profesionales distribuidos en Uruguay
-- - categorias y servicios variados
-- - 1 cliente QA para probar favoritos
--
-- Credenciales QA sugeridas:
-- - password comun para todos: PluraQA2026!
-- - cliente: qa.cliente.marketplace@plura.test

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH seed_categories(name, slug, display_order) AS (
    VALUES
        ('Cabello', 'cabello', 1),
        ('Unas', 'unas', 2),
        ('Barberia', 'barberia', 3),
        ('Pestanas y Cejas', 'pestanas-cejas', 4),
        ('Estetica Facial', 'estetica-facial', 5),
        ('Depilacion', 'depilacion', 6),
        ('Masajes', 'masajes', 7),
        ('Spa', 'spa', 8),
        ('Maquillaje', 'maquillaje', 9),
        ('Cosmetologia', 'cosmetologia', 10),
        ('Bienestar Holistico', 'bienestar-holistico', 11)
)
INSERT INTO categories (name, slug, display_order, active)
SELECT name, slug, display_order, true
FROM seed_categories
ON CONFLICT (slug) DO UPDATE
SET
    display_order = EXCLUDED.display_order,
    active = true;

WITH client_seed(email, full_name, phone_number) AS (
    VALUES
        ('qa.cliente.marketplace@plura.test', 'Cliente QA Marketplace', '+59894000100')
)
INSERT INTO app_user (
    full_name,
    email,
    phone_number,
    password,
    role,
    created_at,
    session_version,
    email_verified_at,
    phone_verified_at
)
SELECT
    full_name,
    email,
    phone_number,
    crypt('PluraQA2026!', gen_salt('bf', 12)),
    'USER',
    NOW(),
    1,
    NOW(),
    NOW()
FROM client_seed
ON CONFLICT (email) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    password = EXCLUDED.password,
    role = 'USER',
    email_verified_at = COALESCE(app_user.email_verified_at, NOW()),
    phone_verified_at = COALESCE(app_user.phone_verified_at, NOW()),
    deleted_at = NULL;

WITH professional_seed(
    seed_order,
    email,
    full_name,
    phone_number,
    slug,
    category_slug,
    headline,
    neighborhood,
    city,
    full_address,
    latitude,
    longitude,
    rating,
    reviews_count
) AS (
    VALUES
        (1, 'ana.rossi.pocitos@plura.test', 'Ana Rossi', '+59894001001', 'ana-rossi-pocitos', 'cabello', 'Color y brushing en Pocitos', 'Pocitos', 'Montevideo', '26 de Marzo 3456', -34.9108, -56.1497, 4.90, 128),
        (2, 'lucia.suarez.cordon@plura.test', 'Lucia Suarez', '+59894001002', 'lucia-suarez-cordon', 'unas', 'Manicura soft gel en Cordon', 'Cordon', 'Montevideo', '18 de Julio 1865', -34.9052, -56.1771, 4.70, 64),
        (3, 'martina.pereyra.carrasco@plura.test', 'Martina Pereyra', '+59894001003', 'martina-pereyra-carrasco', 'pestanas-cejas', 'Lifting y diseno de cejas en Carrasco', 'Carrasco', 'Montevideo', 'Arocena 1575', -34.8866, -56.0588, 4.80, 83),
        (4, 'sofia.mendez.centro@plura.test', 'Sofia Mendez', '+59894001004', 'sofia-mendez-centro', 'estetica-facial', 'Faciales y dermaplaning en Centro', 'Centro', 'Montevideo', 'San Jose 1120', -34.9065, -56.1910, 4.60, 51),
        (5, 'valentina.silva.prado@plura.test', 'Valentina Silva', '+59894001005', 'valentina-silva-prado', 'masajes', 'Masajes descontracturantes en Prado', 'Prado', 'Montevideo', 'Agraciada 3780', -34.8695, -56.2038, 4.90, 117),
        (6, 'camila.nunez.parque-rodo@plura.test', 'Camila Nunez', '+59894001006', 'camila-nunez-parque-rodo', 'depilacion', 'Depilacion laser en Parque Rodo', 'Parque Rodo', 'Montevideo', 'Bulevar Espana 2215', -34.9152, -56.1662, 4.70, 42),
        (7, 'federico.ramos.cordon@plura.test', 'Federico Ramos', '+59894001007', 'federico-ramos-cordon', 'barberia', 'Cortes clasicos y fade en Cordon', 'Cordon', 'Montevideo', 'Maldonado 1878', -34.9057, -56.1806, 4.80, 96),
        (8, 'diego.sosa.pocitos@plura.test', 'Diego Sosa', '+59894001008', 'diego-sosa-pocitos', 'barberia', 'Barberia y perfilado en Pocitos', 'Pocitos', 'Montevideo', 'Avenida Brasil 2987', -34.9184, -56.1549, 4.60, 39),
        (9, 'nicolas.vera.centro@plura.test', 'Nicolas Vera', '+59894001009', 'nicolas-vera-centro', 'barberia', 'Corte y barba en Centro', 'Centro', 'Montevideo', 'Yi 1365', -34.9043, -56.1887, 4.50, 28),
        (10, 'paula.garcia.malvin@plura.test', 'Paula Garcia', '+59894001010', 'paula-garcia-malvin', 'cabello', 'Balayage y peinados en Malvin', 'Malvin', 'Montevideo', 'Orinoco 4921', -34.8915, -56.1275, 4.90, 101),
        (11, 'belen.ortiz.carrasco@plura.test', 'Belen Ortiz', '+59894001011', 'belen-ortiz-carrasco', 'maquillaje', 'Maquillaje social en Carrasco', 'Carrasco', 'Montevideo', 'Costa Rica 1700', -34.8875, -56.0628, 4.80, 57),
        (12, 'romina.bentancur.ciudad-vieja@plura.test', 'Romina Bentancur', '+59894001012', 'romina-bentancur-ciudad-vieja', 'unas', 'Nail art en Ciudad Vieja', 'Ciudad Vieja', 'Montevideo', 'Sarandi 520', -34.9069, -56.2091, 4.70, 46),
        (13, 'julieta.piris.shangrila@plura.test', 'Julieta Piris', '+59894001013', 'julieta-piris-shangrila', 'cabello', 'Color y cortes en Shangrila', 'Shangrila', 'Ciudad de la Costa', 'Calcagno 1120', -34.8392, -55.9881, 4.80, 73),
        (14, 'ximena.ferreira.lagomar@plura.test', 'Ximena Ferreira', '+59894001014', 'ximena-ferreira-lagomar', 'pestanas-cejas', 'Pestanas y cejas en Lagomar', 'Lagomar', 'Ciudad de la Costa', 'Avenida Giannattasio km 21.5', -34.8334, -55.9668, 4.60, 33),
        (15, 'noelia.acosta.solymar@plura.test', 'Noelia Acosta', '+59894001015', 'noelia-acosta-solymar', 'masajes', 'Masajes relajantes en Solymar', 'Solymar', 'Ciudad de la Costa', 'Marquez Castro 2450', -34.8295, -55.9358, 4.90, 88),
        (16, 'bruno.alvez.atlantida@plura.test', 'Bruno Alvez', '+59894001016', 'bruno-alvez-atlantida', 'barberia', 'Barberia moderna en Atlantida', 'Atlantida', 'Atlantida', 'Calle 11 y Ciudad de Montevideo', -34.7688, -55.7581, 4.70, 41),
        (17, 'micaela.techera.punta@plura.test', 'Micaela Techera', '+59894001017', 'micaela-techera-punta', 'unas', 'Semipermanente y kapping en Punta del Este', 'Punta del Este', 'Punta del Este', 'Gorlero 890', -34.9617, -54.9510, 4.80, 92),
        (18, 'agustina.cardozo.maldonado@plura.test', 'Agustina Cardozo', '+59894001018', 'agustina-cardozo-maldonado', 'estetica-facial', 'Faciales y peeling en Maldonado', 'Centro', 'Maldonado', 'Sarandi 842', -34.9055, -54.9587, 4.60, 36),
        (19, 'carolina.rodriguez.labarra@plura.test', 'Carolina Rodriguez', '+59894001019', 'carolina-rodriguez-la-barra', 'masajes', 'Masajes y spa express en La Barra', 'La Barra', 'Maldonado', 'Ruta 10 km 161', -34.9078, -54.7870, 4.90, 67),
        (20, 'florencia.cabrera.piriapolis@plura.test', 'Florencia Cabrera', '+59894001020', 'florencia-cabrera-piriapolis', 'depilacion', 'Depilacion definitiva en Piriapolis', 'Centro', 'Piriapolis', 'Rambla de los Argentinos 1250', -34.8623, -55.2741, 4.50, 24),
        (21, 'mariana.ibarra.colonia@plura.test', 'Mariana Ibarra', '+59894001021', 'mariana-ibarra-colonia', 'bienestar-holistico', 'Bienestar integral en Colonia', 'Centro', 'Colonia del Sacramento', 'General Flores 214', -34.4718, -57.8448, 4.80, 59),
        (22, 'gabriela.lemes.carmelo@plura.test', 'Gabriela Lemes', '+59894001022', 'gabriela-lemes-carmelo', 'cosmetologia', 'Cosmetologia y cuidado de piel en Carmelo', 'Centro', 'Carmelo', '19 de Abril 545', -34.0002, -58.2849, 4.70, 31),
        (23, 'veronica.viera.salto@plura.test', 'Veronica Viera', '+59894001023', 'veronica-viera-salto', 'masajes', 'Masoterapia deportiva en Salto', 'Centro', 'Salto', 'Uruguay 1325', -31.3849, -57.9657, 4.90, 76),
        (24, 'cecilia.cuello.paysandu@plura.test', 'Cecilia Cuello', '+59894001024', 'cecilia-cuello-paysandu', 'estetica-facial', 'Higiene facial y glow en Paysandu', 'Centro', 'Paysandu', '18 de Julio 1042', -32.3207, -58.0781, 4.60, 27)
),
upsert_professional_users AS (
    INSERT INTO app_user (
        full_name,
        email,
        phone_number,
        password,
        role,
        created_at,
        session_version,
        email_verified_at,
        phone_verified_at
    )
    SELECT
        ps.full_name,
        ps.email,
        ps.phone_number,
        crypt('PluraQA2026!', gen_salt('bf', 12)),
        'PROFESSIONAL',
        NOW() - (ps.seed_order || ' days')::interval,
        1,
        NOW(),
        NOW()
    FROM professional_seed ps
    ON CONFLICT (email) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        password = EXCLUDED.password,
        role = 'PROFESSIONAL',
        email_verified_at = COALESCE(app_user.email_verified_at, NOW()),
        phone_verified_at = COALESCE(app_user.phone_verified_at, NOW()),
        deleted_at = NULL
    RETURNING id, email
)
INSERT INTO professional_profile (
    user_id,
    rubro,
    display_name,
    slug,
    public_headline,
    public_about,
    location,
    country,
    city,
    full_address,
    location_text,
    latitude,
    longitude,
    rating,
    reviews_count,
    tipo_cliente,
    schedule_json,
    slot_duration_minutes,
    active,
    created_at
)
SELECT
    u.id,
    c.name,
    ps.full_name,
    ps.slug,
    ps.headline,
    ps.full_name
        || ' atiende en '
        || ps.neighborhood
        || ', '
        || ps.city
        || ', Uruguay. Perfil preparado para QA de marketplace, busqueda, filtros, mapa y favoritos.',
    ps.full_address || ', ' || ps.city || ', Uruguay',
    'Uruguay',
    ps.city,
    ps.full_address,
    ps.neighborhood || ', ' || ps.city || ', Uruguay',
    ps.latitude,
    ps.longitude,
    ps.rating,
    ps.reviews_count,
    'LOCAL',
    '{"days":[{"day":"mon","enabled":true,"paused":false,"ranges":[{"id":"range-mon-1","start":"09:00","end":"18:00"}]},{"day":"tue","enabled":true,"paused":false,"ranges":[{"id":"range-tue-1","start":"09:00","end":"18:00"}]},{"day":"wed","enabled":true,"paused":false,"ranges":[{"id":"range-wed-1","start":"09:00","end":"18:00"}]},{"day":"thu","enabled":true,"paused":false,"ranges":[{"id":"range-thu-1","start":"09:00","end":"18:00"}]},{"day":"fri","enabled":true,"paused":false,"ranges":[{"id":"range-fri-1","start":"09:00","end":"18:00"}]},{"day":"sat","enabled":true,"paused":false,"ranges":[{"id":"range-sat-1","start":"10:00","end":"14:00"}]},{"day":"sun","enabled":false,"paused":false,"ranges":[]}],"pauses":[],"slotDurationMinutes":30}',
    30,
    true,
    NOW() - (ps.seed_order || ' days')::interval
FROM professional_seed ps
JOIN upsert_professional_users u ON u.email = ps.email
JOIN categories c ON c.slug = ps.category_slug
ON CONFLICT (user_id) DO UPDATE
SET
    rubro = EXCLUDED.rubro,
    display_name = EXCLUDED.display_name,
    slug = EXCLUDED.slug,
    public_headline = EXCLUDED.public_headline,
    public_about = EXCLUDED.public_about,
    location = EXCLUDED.location,
    country = EXCLUDED.country,
    city = EXCLUDED.city,
    full_address = EXCLUDED.full_address,
    location_text = EXCLUDED.location_text,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    tipo_cliente = EXCLUDED.tipo_cliente,
    schedule_json = EXCLUDED.schedule_json,
    slot_duration_minutes = EXCLUDED.slot_duration_minutes,
    active = true,
    created_at = professional_profile.created_at;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'professional_profile'
          AND column_name = 'geom'
    ) THEN
        EXECUTE $sql$
            WITH professional_seed(email, latitude, longitude) AS (
                VALUES
                    ('ana.rossi.pocitos@plura.test', -34.9108, -56.1497),
                    ('lucia.suarez.cordon@plura.test', -34.9052, -56.1771),
                    ('martina.pereyra.carrasco@plura.test', -34.8866, -56.0588),
                    ('sofia.mendez.centro@plura.test', -34.9065, -56.1910),
                    ('valentina.silva.prado@plura.test', -34.8695, -56.2038),
                    ('camila.nunez.parque-rodo@plura.test', -34.9152, -56.1662),
                    ('federico.ramos.cordon@plura.test', -34.9057, -56.1806),
                    ('diego.sosa.pocitos@plura.test', -34.9184, -56.1549),
                    ('nicolas.vera.centro@plura.test', -34.9043, -56.1887),
                    ('paula.garcia.malvin@plura.test', -34.8915, -56.1275),
                    ('belen.ortiz.carrasco@plura.test', -34.8875, -56.0628),
                    ('romina.bentancur.ciudad-vieja@plura.test', -34.9069, -56.2091),
                    ('julieta.piris.shangrila@plura.test', -34.8392, -55.9881),
                    ('ximena.ferreira.lagomar@plura.test', -34.8334, -55.9668),
                    ('noelia.acosta.solymar@plura.test', -34.8295, -55.9358),
                    ('bruno.alvez.atlantida@plura.test', -34.7688, -55.7581),
                    ('micaela.techera.punta@plura.test', -34.9617, -54.9510),
                    ('agustina.cardozo.maldonado@plura.test', -34.9055, -54.9587),
                    ('carolina.rodriguez.labarra@plura.test', -34.9078, -54.7870),
                    ('florencia.cabrera.piriapolis@plura.test', -34.8623, -55.2741),
                    ('mariana.ibarra.colonia@plura.test', -34.4718, -57.8448),
                    ('gabriela.lemes.carmelo@plura.test', -34.0002, -58.2849),
                    ('veronica.viera.salto@plura.test', -31.3849, -57.9657),
                    ('cecilia.cuello.paysandu@plura.test', -32.3207, -58.0781)
            )
            UPDATE professional_profile p
            SET geom = ST_SetSRID(ST_MakePoint(ps.longitude, ps.latitude), 4326)::geography
            FROM professional_seed ps
            JOIN app_user u ON u.email = ps.email
            WHERE p.user_id = u.id
        $sql$;
    END IF;
END $$;

WITH seed_emails AS (
    SELECT email
    FROM (
        VALUES
            ('ana.rossi.pocitos@plura.test'),
            ('lucia.suarez.cordon@plura.test'),
            ('martina.pereyra.carrasco@plura.test'),
            ('sofia.mendez.centro@plura.test'),
            ('valentina.silva.prado@plura.test'),
            ('camila.nunez.parque-rodo@plura.test'),
            ('federico.ramos.cordon@plura.test'),
            ('diego.sosa.pocitos@plura.test'),
            ('nicolas.vera.centro@plura.test'),
            ('paula.garcia.malvin@plura.test'),
            ('belen.ortiz.carrasco@plura.test'),
            ('romina.bentancur.ciudad-vieja@plura.test'),
            ('julieta.piris.shangrila@plura.test'),
            ('ximena.ferreira.lagomar@plura.test'),
            ('noelia.acosta.solymar@plura.test'),
            ('bruno.alvez.atlantida@plura.test'),
            ('micaela.techera.punta@plura.test'),
            ('agustina.cardozo.maldonado@plura.test'),
            ('carolina.rodriguez.labarra@plura.test'),
            ('florencia.cabrera.piriapolis@plura.test'),
            ('mariana.ibarra.colonia@plura.test'),
            ('gabriela.lemes.carmelo@plura.test'),
            ('veronica.viera.salto@plura.test'),
            ('cecilia.cuello.paysandu@plura.test')
    ) AS emails(email)
)
DELETE FROM professional_categories pc
USING professional_profile p, app_user u, seed_emails se
WHERE pc.professional_id = p.id
  AND u.id = p.user_id
  AND se.email = u.email;

WITH professional_seed(email, category_slug) AS (
    VALUES
        ('ana.rossi.pocitos@plura.test', 'cabello'),
        ('lucia.suarez.cordon@plura.test', 'unas'),
        ('martina.pereyra.carrasco@plura.test', 'pestanas-cejas'),
        ('sofia.mendez.centro@plura.test', 'estetica-facial'),
        ('valentina.silva.prado@plura.test', 'masajes'),
        ('camila.nunez.parque-rodo@plura.test', 'depilacion'),
        ('federico.ramos.cordon@plura.test', 'barberia'),
        ('diego.sosa.pocitos@plura.test', 'barberia'),
        ('nicolas.vera.centro@plura.test', 'barberia'),
        ('paula.garcia.malvin@plura.test', 'cabello'),
        ('belen.ortiz.carrasco@plura.test', 'maquillaje'),
        ('romina.bentancur.ciudad-vieja@plura.test', 'unas'),
        ('julieta.piris.shangrila@plura.test', 'cabello'),
        ('ximena.ferreira.lagomar@plura.test', 'pestanas-cejas'),
        ('noelia.acosta.solymar@plura.test', 'masajes'),
        ('bruno.alvez.atlantida@plura.test', 'barberia'),
        ('micaela.techera.punta@plura.test', 'unas'),
        ('agustina.cardozo.maldonado@plura.test', 'estetica-facial'),
        ('carolina.rodriguez.labarra@plura.test', 'masajes'),
        ('florencia.cabrera.piriapolis@plura.test', 'depilacion'),
        ('mariana.ibarra.colonia@plura.test', 'bienestar-holistico'),
        ('gabriela.lemes.carmelo@plura.test', 'cosmetologia'),
        ('veronica.viera.salto@plura.test', 'masajes'),
        ('cecilia.cuello.paysandu@plura.test', 'estetica-facial')
)
INSERT INTO professional_categories (professional_id, category_id)
SELECT
    p.id,
    c.id
FROM professional_seed ps
JOIN app_user u ON u.email = ps.email
JOIN professional_profile p ON p.user_id = u.id
JOIN categories c ON c.slug = ps.category_slug
ON CONFLICT (professional_id, category_id) DO NOTHING;

WITH professional_seed(email, category_slug) AS (
    VALUES
        ('ana.rossi.pocitos@plura.test', 'cabello'),
        ('lucia.suarez.cordon@plura.test', 'unas'),
        ('martina.pereyra.carrasco@plura.test', 'pestanas-cejas'),
        ('sofia.mendez.centro@plura.test', 'estetica-facial'),
        ('valentina.silva.prado@plura.test', 'masajes'),
        ('camila.nunez.parque-rodo@plura.test', 'depilacion'),
        ('federico.ramos.cordon@plura.test', 'barberia'),
        ('diego.sosa.pocitos@plura.test', 'barberia'),
        ('nicolas.vera.centro@plura.test', 'barberia'),
        ('paula.garcia.malvin@plura.test', 'cabello'),
        ('belen.ortiz.carrasco@plura.test', 'maquillaje'),
        ('romina.bentancur.ciudad-vieja@plura.test', 'unas'),
        ('julieta.piris.shangrila@plura.test', 'cabello'),
        ('ximena.ferreira.lagomar@plura.test', 'pestanas-cejas'),
        ('noelia.acosta.solymar@plura.test', 'masajes'),
        ('bruno.alvez.atlantida@plura.test', 'barberia'),
        ('micaela.techera.punta@plura.test', 'unas'),
        ('agustina.cardozo.maldonado@plura.test', 'estetica-facial'),
        ('carolina.rodriguez.labarra@plura.test', 'masajes'),
        ('florencia.cabrera.piriapolis@plura.test', 'depilacion'),
        ('mariana.ibarra.colonia@plura.test', 'bienestar-holistico'),
        ('gabriela.lemes.carmelo@plura.test', 'cosmetologia'),
        ('veronica.viera.salto@plura.test', 'masajes'),
        ('cecilia.cuello.paysandu@plura.test', 'estetica-facial')
),
service_templates(category_slug, service_order, name, description, price, duration) AS (
    VALUES
        ('cabello', 1, 'Corte y brushing', 'Lavado, corte y brushing.', '950', '60 min'),
        ('cabello', 2, 'Color global', 'Coloracion completa con diagnostico.', '2200', '120 min'),
        ('unas', 1, 'Manicura semipermanente', 'Preparacion, esmaltado y brillo.', '890', '60 min'),
        ('unas', 2, 'Kapping gel', 'Refuerzo con gel y terminacion prolija.', '1200', '75 min'),
        ('barberia', 1, 'Corte fade', 'Corte degradado y perfilado.', '780', '45 min'),
        ('barberia', 2, 'Barba y toalla caliente', 'Perfilado clasico con toalla caliente.', '650', '30 min'),
        ('pestanas-cejas', 1, 'Lifting de pestanas', 'Curvado y nutricion de pestanas.', '1100', '75 min'),
        ('pestanas-cejas', 2, 'Diseno y perfilado de cejas', 'Mapeo, diseno y perfilado.', '750', '45 min'),
        ('estetica-facial', 1, 'Limpieza facial profunda', 'Extracciones, mascara y cierre.', '1450', '75 min'),
        ('estetica-facial', 2, 'Dermaplaning glow', 'Exfoliacion mecanica con terminacion glow.', '1700', '60 min'),
        ('masajes', 1, 'Masaje relajante', 'Sesion corporal para descarga general.', '1600', '60 min'),
        ('masajes', 2, 'Masaje descontracturante', 'Foco en cuello, espalda y hombros.', '1800', '60 min'),
        ('depilacion', 1, 'Depilacion definitiva zona pequena', 'Sesion con seguimiento de parametros.', '1300', '30 min'),
        ('depilacion', 2, 'Depilacion definitiva piernas', 'Sesion completa de piernas.', '2600', '60 min'),
        ('maquillaje', 1, 'Maquillaje social', 'Look para eventos y salidas.', '1900', '60 min'),
        ('maquillaje', 2, 'Maquillaje novia prueba', 'Prueba completa previa al evento.', '3200', '90 min'),
        ('cosmetologia', 1, 'Hidratacion intensiva', 'Rutina personalizada segun tipo de piel.', '1350', '60 min'),
        ('cosmetologia', 2, 'Peeling suave', 'Renovacion superficial con seguimiento.', '1650', '45 min'),
        ('bienestar-holistico', 1, 'Reiki armonizacion', 'Sesion integral de bienestar.', '1200', '60 min'),
        ('bienestar-holistico', 2, 'Yoga facial guiado', 'Rutina guiada para rostro y relajacion.', '950', '45 min')
)
INSERT INTO professional_service (
    id,
    professional_id,
    category_id,
    name,
    description,
    price,
    duration,
    post_buffer_minutes,
    currency,
    payment_type,
    active,
    created_at
)
SELECT
    lower(
        substr(md5(ps.email || ':' || st.service_order::text), 1, 8)
        || '-'
        || substr(md5(ps.email || ':' || st.service_order::text), 9, 4)
        || '-'
        || substr(md5(ps.email || ':' || st.service_order::text), 13, 4)
        || '-'
        || substr(md5(ps.email || ':' || st.service_order::text), 17, 4)
        || '-'
        || substr(md5(ps.email || ':' || st.service_order::text), 21, 12)
    ) AS id,
    p.id,
    c.id,
    st.name,
    st.description,
    st.price,
    st.duration,
    0,
    'UYU',
    'ON_SITE',
    true,
    NOW() - (st.service_order || ' hours')::interval
FROM professional_seed ps
JOIN service_templates st ON st.category_slug = ps.category_slug
JOIN app_user u ON u.email = ps.email
JOIN professional_profile p ON p.user_id = u.id
JOIN categories c ON c.slug = st.category_slug
ON CONFLICT (id) DO UPDATE
SET
    professional_id = EXCLUDED.professional_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    duration = EXCLUDED.duration,
    post_buffer_minutes = EXCLUDED.post_buffer_minutes,
    currency = EXCLUDED.currency,
    payment_type = EXCLUDED.payment_type,
    active = true;

REFRESH MATERIALIZED VIEW CONCURRENTLY search_professional_document_mv;
REFRESH MATERIALIZED VIEW CONCURRENTLY search_service_document_mv;
