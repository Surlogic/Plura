package com.plura.plurabackend.auth.oauth;

/**
 * Record inmutable que encapsula la informacion del usuario obtenida
 * de un proveedor OAuth (Google o Apple) despues de verificar el token.
 *
 * <p>Contiene los datos esenciales del usuario necesarios para crear
 * o vincular una cuenta en el sistema.</p>
 *
 * @param provider   nombre del proveedor OAuth (ej: "google", "apple")
 * @param providerId identificador unico del usuario en el proveedor (subject/sub del token)
 * @param email      email del usuario proporcionado por el proveedor (puede ser null en Apple)
 * @param name       nombre del usuario, o un nombre derivado del email como respaldo
 * @param avatar     URL del avatar/foto de perfil del usuario (puede ser null)
 */
public record OAuthUserInfo(
    String provider,
    String providerId,
    String email,
    String name,
    String avatar
) {}
