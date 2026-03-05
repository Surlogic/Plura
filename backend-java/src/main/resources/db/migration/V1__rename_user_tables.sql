-- Source: backend-java/db/rename_user_tables.sql
-- Normaliza los nombres de tablas a snake_case y conserva las tablas antiguas como backup.
-- user_normal/user_cliente (legacy) se renombran con sufijo _legacy.
-- "UserNormal" -> user_cliente
-- "UserCliente" -> user_profesional

ALTER TABLE IF EXISTS user_cliente RENAME TO user_cliente_legacy;
ALTER TABLE IF EXISTS user_normal RENAME TO user_normal_legacy;

ALTER TABLE IF EXISTS "UserNormal" RENAME TO user_cliente;
ALTER TABLE IF EXISTS "UserCliente" RENAME TO user_profesional;

